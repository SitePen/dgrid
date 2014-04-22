define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/on",
	"dojo/aspect",
	"dojo/has",
	"dojo/query",
	"./Grid",
	"put-selector/put",
	"dojo/_base/sniff"
], function(declare, lang, Deferred, on, aspect, has, query, Grid, put){

// Variables to track info for cell currently being edited
// (active* variables are for editOn editors only)
	var activeCell, activeValue, activeOptions;

	return declare(null, {

		postCreate: function(){
			var self = this,
				previouslyFocusedCell;

			this.inherited(arguments);

			this.on('.dgrid-input:focusin', function(){
				self._focusedCell = self.cell(this);
			});
			this._editorFocusoutHandle = on.pausable(this.domNode, '.dgrid-input:focusout', function(){
				self._focusedCell = null;
			});
			this._editorColumnListeners.push(this._editorFocusoutHandle);

			aspect.before(this, 'removeRow', function(row){
				var focusedCell = self._focusedCell;
				row = this.row(row);
				if(focusedCell && focusedCell.row.id === row.id){
					previouslyFocusedCell = focusedCell;
					// Pause the focusout handler until after this row has had
					// time to re-render, if this removal is part of an update.
					// A setTimeout is used here instead of resuming in the
					// insertRow aspect below, since if a row were actually
					// removed (not updated) while editing, the handler would
					// not be properly hooked up again for future occurrences.
					self._editorFocusoutHandle.pause();
					setTimeout(function(){
						self._editorFocusoutHandle.resume();
						previouslyFocusedCell = null;
					}, 0);
				}
			});
			aspect.after(this, 'insertRow', function(rowElement){
				var focusedCell = self._focusedCell;
				var row = self.row(rowElement);
				if (previouslyFocusedCell && previouslyFocusedCell.row.id === row.id){
					self.edit(self.cell(row, previouslyFocusedCell.column.id));
				}
				return rowElement;
			});
		},

		configStructure: function(){
			this._editorStructureCleanup();
			this.inherited(arguments);
		},

		_destroyColumns: function(){
			this._editorStructureCleanup();
			this.inherited(arguments);
		},

		_editorStructureCleanup: function(){
			var editorInstances = this._editorInstances,
				listeners = this._editorColumnListeners;

			if(this._editTimer){
				clearTimeout(this._editTimer);
			}
			// Do any clean up of previous column structure.
			if(editorInstances){
				for(var columnId in editorInstances){
					var editor = editorInstances[columnId];
					if(editor.domNode){
						// The editor is a widget
						editor.destroyRecursive();
					}
				}
			}
			this._editorInstances = {};

			if(listeners){
				for(var i = 0, l = listeners.len; i < l; i++){
					listeners[i].remove();
				}
			}
			this._editorColumnListeners = [];
		},

		_configColumns: function(prefix, columns){
			var columnArray = this.inherited(arguments);
			for(var i = 0, l = columnArray.length; i < l; i++){
				this._configureEditorColumn(columnArray[i]);
			}
			return columnArray;
		},

		_configureEditorColumn: function(column){
			// summary:
			//		Adds editing capability to a column's cells.
			var editor = column.editor;
			var self = this;

			if(editor){
				var originalRenderCell = column.renderCell || Grid.defaultRenderCell;
				var editOn = column.editOn;
				var isWidget = typeof editor != "string";

				if(editOn){
					// Create one shared widget/input to be swapped into the active cell.
					this._editorInstances[column.id] = this._createSharedEditor(column, originalRenderCell);
				}else{
					if(isWidget){
						// add advice for cleaning up widgets in this column
						aspect.before(this, "removeRow", function(rowElement){
							// destroy our widget during the row removal operation,
							// but don't trip over loading nodes from incomplete requests
							var cellElement = self.cell(rowElement, column.id).element,
								widget = cellElement && (cellElement.contents || cellElement).widget;
							if(widget){
								self._editorFocusoutHandle.pause();
								widget.destroyRecursive();
							}
						});
					}
				}

				column.renderCell = editOn ? function(object, value, cell, options){
					// TODO: Consider using event delegation
					// (Would require using dgrid's focus events for activating on focus,
					// which we already advocate in README for optimal use)

					if(!options || !options.alreadyHooked){
						// in IE<8, cell is the child of the td due to the extra padding node
						self._editorColumnListeners.push(on(cell.tagName == "TD" ? cell : cell.parentNode, editOn, function(){
							activeOptions = options;
							self.edit(this);
						}));
					}

					// initially render content in non-edit mode
					return originalRenderCell.call(column, object, value, cell, options);

				} : function(object, value, cell, options){
					// always-on: create editor immediately upon rendering each cell
					if(!column.canEdit || column.canEdit(object, value)){
						var cmp = self._createEditor(column);
						self.showEditor(cmp, column, cell, value);
						// Maintain reference for later use.
						cell[isWidget ? "widget" : "input"] = cmp;
					}else{
						return originalRenderCell.call(column, object, value, cell, options);
					}
				};
			}
		},

		edit: function(cell){
			// summary:
			//		Method to be mixed into grid instances, which will show/focus the
			//		editor for a given grid cell.  Also used by renderCell.
			// cell: Object
			//		Cell (or something resolvable by grid.cell) to activate editor on.
			// returns:
			//		If the cell is editable, returns a promise resolving to the editor
			//		input/widget when the cell editor is focused.
			//		If the cell is not editable, returns null.

			var row, column, cellElement, dirty, field, value, cmp, dfd;

			if(!cell.column){
				cell = this.cell(cell);
			}
			if(!cell || !cell.element){
				return null;
			}

			column = cell.column;
			field = column.field;
			cellElement = cell.element.contents || cell.element;

			if((cmp = this._editorInstances[column.id])){ // shared editor (editOn used)
				if(activeCell != cellElement){
					// get the cell value
					row = cell.row;
					dirty = this.dirty && this.dirty[row.id];
					value = (dirty && field in dirty) ? dirty[field] :
						column.get ? column.get(row.data) : row.data[field];
					// check to see if the cell can be edited
					if(!column.canEdit || column.canEdit(cell.row.data, value)){
						activeCell = cellElement;

						// In some browsers, moving a DOM node causes a blur event to fire.  Pause
						// the handler until the move is complete.
						if(column._editorBlurHandle){
							column._editorBlurHandle.pause();
						}

						this.showEditor(cmp, column, cellElement, value);

						// focus / blur-handler-resume logic is surrounded in a setTimeout
						// to play nice with Keyboard's dgrid-cellfocusin as an editOn event
						dfd = new Deferred();
						this._editTimer = setTimeout(function(){
							// focus the newly-placed control (supported by form widgets and HTML inputs)
							if(cmp.focus){
								cmp.focus();
							}
							// resume blur handler once editor is focused
							if(column._editorBlurHandle){
								column._editorBlurHandle.resume();
							}
							this._editTimer = null;
							dfd.resolve(cmp);
						}, 0);

						return dfd.promise;
					}
				}

			}else if(column.editor){ // editor but not shared; always-on
				cmp = cellElement.widget || cellElement.input;
				if(cmp){
					dfd = new Deferred();
					if(cmp.focus){
						cmp.focus();
					}
					dfd.resolve(cmp);
					return dfd.promise;
				}
			}
			return null;
		},

		showEditor: function(cmp, column, cellElement, value){
			// Places a shared editor into the newly-active cell in the column.
			// Also called when rendering an editor in an "always-on" editor column.

			var isWidget = cmp.domNode;

			// for regular inputs, we can update the value before even showing it
			if(!isWidget){
				this._updateInputValue(cmp, value);
			}

			cellElement.innerHTML = "";
			put(cellElement, ".dgrid-cell-editing");
			put(cellElement, cmp.domNode || cmp);

			if(isWidget){
				// For widgets, ensure startup is called before setting value,
				// to maximize compatibility with flaky widgets like dijit/form/Select.
				if(!cmp._started){
					cmp.startup();
				}

				// Set value, but ensure it isn't processed as a user-generated change.
				// (Clear flag on a timeout to wait for delayed onChange to fire first)
				cmp._dgridIgnoreChange = true;
				cmp.set("value", value);
				setTimeout(function(){
					cmp._dgridIgnoreChange = false;
				}, 0);
			}
			// track previous value for short-circuiting or in case we need to revert
			cmp._dgridLastValue = value;
			// if this is an editor with editOn, also update activeValue
			// (activeOptions will have been updated previously)
			if(activeCell){
				activeValue = value;
				// emit an event immediately prior to placing a shared editor
				on.emit(cellElement, "dgrid-editor-show", {
					grid: this,
					cell: this.cell(cellElement),
					column: column,
					editor: cmp,
					bubbles: true,
					cancelable: false
				});
			}
		},

		_createEditor: function(column){
			// Creates an editor instance based on column definition properties,
			// and hooks up events.
			var editor = column.editor,
				editOn = column.editOn,
				self = this,
				isWidget = typeof editor != "string", // string == standard HTML input
				args, cmp, node, putstr, handleChange;

			args = column.editorArgs || {};
			if(typeof args == "function"){
				args = args.call(this, column);
			}

			if(isWidget){
				cmp = new editor(args);
				node = cmp.focusNode || cmp.domNode;

				// Add dgrid-input to className to make consistent with HTML inputs.
				node.className += " dgrid-input";

				// For editOn editors, connect to onBlur rather than onChange, since
				// the latter is delayed by setTimeouts in Dijit and will fire too late.
				cmp.on(editOn ? "blur" : "change", function(){
					if(!cmp._dgridIgnoreChange){
						self._setPropertyFromEditor(column, this, {type: "widget"});
					}
				});
			}else{
				handleChange = function(evt){
					var target = evt.target;
					if("_dgridLastValue" in target && target.className.indexOf("dgrid-input") > -1){
						self._setPropertyFromEditor(column, target, evt);
					}
				};

				// considerations for standard HTML form elements
				if(!this._hasInputListener){
					// register one listener at the top level that receives events delegated
					this._hasInputListener = true;
					this.on("change", function(evt){
						handleChange(evt);
					});
					// also register a focus listener
				}

				putstr = editor == "textarea" ? "textarea" :
					"input[type=" + editor + "]";
				cmp = node = put(putstr + ".dgrid-input", lang.mixin({
					name: column.field,
					tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
				}, args));

				if(has("ie") < 9 || (has("ie") && has("quirks"))){
					// IE<9 / quirks doesn't fire change events for all the right things,
					// and it doesn't bubble.
					if(editor == "radio" || editor == "checkbox"){
						// listen for clicks since IE doesn't fire change events properly for checks/radios
						this._editorColumnListeners.push(on(cmp, "click", function(evt){
							handleChange(evt);
						}));
					}else{
						this._editorColumnListeners.push(on(cmp, "change", function(evt){
							handleChange(evt);
						}));
					}
				}
			}

			return cmp;
		},

		_createSharedEditor: function(column, originalRenderCell){
			// Creates an editor instance with additional considerations for
			// shared usage across an entire column (for columns with editOn specified).

			var cmp = this._createEditor(column),
				self = this,
				isWidget = cmp.domNode,
				node = cmp.domNode || cmp,
				focusNode = cmp.focusNode || node,
				reset = isWidget ?
					function(){
						cmp.set("value", cmp._dgridLastValue);
					} :
					function(){
						self._updateInputValue(cmp, cmp._dgridLastValue);
						// call setProperty again in case we need to revert a previous change
						self._setPropertyFromEditor(column, cmp);
					};

			function blur(){
				var element = activeCell;
				focusNode.blur();

				if(typeof this.focus === "function"){
					// Dijit form widgets don't end up dismissed until the next turn,
					// so wait before calling focus (otherwise Keyboard will focus the
					// input again).  IE<9 needs to wait longer, otherwise the cell loses
					// focus after we've set it.
					setTimeout(function(){
						self.focus(element);
					}, isWidget && has("ie") < 9 ? 15 : 0);
				}
			}

			function onblur(){
				var parentNode = node.parentNode,
					i = parentNode.children.length - 1,
					options = { alreadyHooked: true },
					cell = self.cell(node);

				// emit an event immediately prior to removing an editOn editor
				on.emit(cell.element, "dgrid-editor-hide", {
					grid: self,
					cell: cell,
					column: column,
					editor: cmp,
					bubbles: true,
					cancelable: false
				});
				column._editorBlurHandle.pause();
				// Remove the editor from the cell, to be reused later.
				parentNode.removeChild(node);

				if(cell.row){
					// If the row is still present (i.e. we didn't blur due to removal),
					// clear out the rest of the cell's contents, then re-render with new value.
					put(cell.element, "!dgrid-cell-editing");
					while(i--){
						put(parentNode.firstChild, "!");
					}
					Grid.appendIfNode(parentNode, column.renderCell(cell.row.data, activeValue, parentNode,
						activeOptions ? lang.delegate(options, activeOptions) : options));
				}

				// Reset state now that editor is deactivated;
				// reset focusedCell as well since some browsers will not trigger the
				// focusout event handler in this case
				activeCell = activeValue = activeOptions = null;
				this._focusedCell = null;
			}

			function dismissOnKey(evt){
				// Contains logic for reacting to enter/escape keypresses to save/cancel edits.
				// Calls `focusNode.blur()` in cases where field should be dismissed.
				var key = evt.keyCode || evt.which;

				if(key == 27){ // escape: revert + dismiss
					reset();
					activeValue = cmp._dgridLastValue;
					blur();
				}else if(key == 13 && column.dismissOnEnter !== false){ // enter: dismiss
					// FIXME: Opera is "reverting" even in this case
					blur();
				}
			}

			// hook up enter/esc key handling
			this._editorColumnListeners.push(on(focusNode, "keydown", dismissOnKey));

			// hook up blur handler, but don't activate until widget is activated
			(column._editorBlurHandle = on.pausable(cmp, "blur", onblur)).pause();
			this._editorColumnListeners.push(column._editorBlurHandle);

			return cmp;
		},

		_setPropertyFromEditor: function(column, cmp, triggerEvent){
			var value, id, editedRow;
			if(!cmp.isValid || cmp.isValid()){
				value = this._setProperty((cmp.domNode || cmp).parentNode,
					activeCell ? activeValue : cmp._dgridLastValue,
					this._dataFromEditor(column, cmp), triggerEvent);

				if(activeCell){ // for editors with editOn defined
					activeValue = value;
				}else{ // for always-on editors, update _dgridLastValue immediately
					cmp._dgridLastValue = value;
				}

				if(cmp.type === "radio" && cmp.name && !column.editOn && column.field){
					editedRow = grid.row(cmp);

					// Update all other rendered radio buttons in the group
					query("input[type=radio][name=" + cmp.name + "]", grid.contentNode).forEach(function(radioBtn){
						var row = grid.row(radioBtn);
						// Only update _dgridLastValue and the dirty data if it exists
						// and is not already false
						if(radioBtn !== cmp && radioBtn._dgridLastValue){
							radioBtn._dgridLastValue = false;
							if(grid.updateDirty){
								grid.updateDirty(row.id, column.field, false);
							}else{
								// update store-less grid
								row.data[column.field] = false;
							}
						}
					});

					// Also update dirty data for rows that are not currently rendered
					for(id in grid.dirty){
						if(editedRow.id !== id && grid.dirty[id][column.field]){
							grid.updateDirty(id, column.field, false);
						}
					}
				}
			}
		},

		_setProperty: function(cellElement, oldValue, value, triggerEvent){
			// Updates dirty hash and fires dgrid-datachange event for a changed value.
			var cell, row, column, eventObject,
				self = this;
			// test whether old and new values are inequal, with coercion (e.g. for Dates)
			if((oldValue && oldValue.valueOf()) != (value && value.valueOf())){
				cell = this.cell(cellElement);
				row = cell.row;
				column = cell.column;
				if(column.field && row){
					// TODO: remove rowId in lieu of cell (or grid.row/grid.cell)
					// (keeping for the moment for back-compat, but will note in changes)
					eventObject = {
						grid: this,
						cell: cell,
						rowId: row.id,
						oldValue: oldValue,
						value: value,
						bubbles: true,
						cancelable: true
					};
					if(triggerEvent && triggerEvent.type){
						eventObject.parentType = triggerEvent.type;
					}

					if(on.emit(cellElement, "dgrid-datachange", eventObject)){
						if(this.updateDirty){
							// for OnDemandGrid: update dirty data, and save if autoSave is true
							this.updateDirty(row.id, column.field, value);
							// perform auto-save (if applicable) in next tick to avoid
							// unintentional mishaps due to order of handler execution
							column.autoSave && setTimeout(function(){
								self._trackError("save");
							}, 0);
						}else{
							// update store-less grid
							row.data[column.field] = value;
						}
					}else{
						// Otherwise keep the value the same
						// For the sake of always-on editors, need to manually reset the value
						var cmp;
						if(cmp = cellElement.widget){
							// set _dgridIgnoreChange to prevent an infinite loop in the
							// onChange handler and prevent dgrid-datachange from firing
							// a second time
							cmp._dgridIgnoreChange = true;
							cmp.set("value", oldValue);
							setTimeout(function(){
								cmp._dgridIgnoreChange = false;
							}, 0);
						}else if(cmp = cellElement.input){
							this._updateInputValue(cmp, oldValue);
						}

						return oldValue;
					}
				}
			}
			return value;
		},

		_updateInputValue: function(input, value){
			// common code for updating value of a standard input
			input.value = value;
			if(input.type == "radio" || input.type == "checkbox"){
				input.checked = input.defaultChecked = !!value;
			}
		},

		_dataFromEditor: function(column, cmp){
			if(typeof cmp.get == "function"){ // widget
				return this._getDataFromValue(cmp.get("value"));
			}else{ // HTML input
				return this._getDataFromValue(
					cmp[cmp.type == "checkbox" || cmp.type == "radio" ? "checked" : "value"]);
			}
		},

		_getDataFromValue: function(value, oldValue){
			// Default logic for translating values from editors;
			// tries to preserve type if possible.
			if(typeof oldValue == "number"){
				value = isNaN(value) ? value : parseFloat(value);
			}else if(typeof oldValue == "boolean"){
				value = value == "true" ? true : value == "false" ? false : value;
			}else if(oldValue instanceof Date){
				var asDate = new Date(value);
				value = isNaN(asDate.getTime()) ? value : asDate;
			}
			return value;
		}
	});
})
;
