define([
	"dojo/_base/declare", "dojo/_base/array", "dojo/on", "dojo/aspect", "dojo/_base/sniff", "put-selector/put"
], function(declare, arrayUtil, on, aspect, has, put){

	function changeInput(column, value){
		// creates a function that modifies the input on an event
		var grid = column.grid;

		return function(event){
			var rows = event.rows,
				len = rows.length,
				state = "false",
				selection, mixed, i,
				selectorHeaderCheckbox = column._selectorHeaderCheckbox;

			for(i = 0; i < len; i++){
				var element = grid.cell(rows[i], column.id).element;
				if(!element){
					continue;
				} // skip if row has been entirely removed
				element = (element.contents || element).input;
				if(element && !element.disabled){
					// only change the value if it is not disabled
					element.checked = value;
					element.setAttribute("aria-checked", value);
				}
			}
			if(column._selectorType === "checkbox" && selectorHeaderCheckbox){
				selection = grid.selection;
				mixed = false;
				// see if the header checkbox needs to be indeterminate
				for(i in selection){
					// if there is anything in the selection, than it is indeterminate
					if(selection[i] != grid.allSelected){
						mixed = true;
						break;
					}
				}
				selectorHeaderCheckbox.indeterminate = mixed;
				selectorHeaderCheckbox.checked = grid.allSelected;
				if(mixed){
					state = "mixed";
				}else if(grid.allSelected){
					state = "true";
				}
				selectorHeaderCheckbox.setAttribute("aria-checked", state);
			}
		};
	}

	function handleSelectorClick(column, event){
		var grid = column.grid;
		// we would really only care about click, since other input sources, like spacebar
		// trigger a click, but the click event doesn't provide access to the shift key in firefox, so
		// listen for keydown's as well to get an event in firefox that we can properly retrieve
		// the shiftKey property from
		if(event.type == "click" || event.keyCode == 32 || (!has("opera") && event.keyCode == 13) || event.keyCode === 0){
			var row = grid.row(event),
				lastRow = grid._lastSelected && grid.row(grid._lastSelected);

			grid._selectionTriggerEvent = event;

			if(column._selectorType == "radio"){
				if(!lastRow || lastRow.id != row.id){
					grid.clearSelection();
					grid.select(row, null, true);
					grid._lastSelected = row.element;
				}
			}else{
				if(row){
					if(event.shiftKey){
						// make sure the last input always ends up checked for shift key
						changeInput(column, true)({rows: [row]});
					}else{
						// no shift key, so no range selection
						lastRow = null;
					}
					lastRow = event.shiftKey ? lastRow : null;
					grid.select(lastRow || row, row, lastRow ? undefined : null);
					grid._lastSelected = row.element;
				}else{
					// No row resolved; must be the select-all checkbox.
					put(grid.domNode, (grid.allSelected ? "!" : ".") + "dgrid-select-all");
					grid[grid.allSelected ? "clearSelection" : "selectAll"]();
				}
			}
			grid._selectionTriggerEvent = null;
		}
	}

	function setupSelectionEvents(column){
		var grid = column.grid;

		if(!grid._hasSelectorInputListener){
			grid._hasSelectorInputListener = true;
			grid.on(".dgrid-selector:click,.dgrid-selector:keydown", function(event){
				handleSelectorClick(column, event);
			});
		}
		// register one listener at the top level that receives events delegated
		// register listeners to the select and deselect events to change the input checked value
		grid.on("dgrid-select", changeInput(column, true));
		grid.on("dgrid-deselect", changeInput(column, false));
	}

	return declare(null, {
		// summary:
		//		Adds an input field (checkbox or radio) to a column that when checked, selects the row
		//		that contains the input field.  To enable, add a "selector" property to a column definition.  The
		//		selector property should contain true, "checkbox", "radio" or be a function that renders the input.
		//		If set to true or "checkbox" the input field will be a checkbox.  If set to "radio", the input field
		//		will be a radio button and only one input in the column will be checked.  If the value of selector is
		//		a function, then the function signature is renderSelectorInput(column, value, cell, object) where
		//		* column - the column definition
		//		* value - the cell's value
		//		* cell - the cell's DOM node
		//		* object - the row's data object
		//		The custom renderSelectorInput function must return an input field.

		_defaultRenderSelectorInput: function(column, value, cell, object){
			var grid = column.grid;
			var parent = cell.parentNode;

			setupSelectionEvents(column);

			// must set the class name on the outer cell in IE for keystrokes to be intercepted
			put(parent && parent.contents ? parent : cell, ".dgrid-selector");
			var input = cell.input || (cell.input = put(cell, "input[type=" + column._selectorType + "]", {
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex,
				disabled: !grid.allowSelect(grid.row(object)),
				checked: value
			}));
			input.setAttribute("aria-checked", !!value);

			return input;
		},

		_configureSelectorColumn: function(column){
			var self = this;
			var selector = column.selector;
			if(selector){
				var grid = this;

				column.sortable = false;
				column._selectorType = (typeof selector === "string") ? selector : "checkbox";
				column._renderSelectorInput = (typeof selector === "function") ? selector : this._defaultRenderSelectorInput;

				aspect.after(column, "destroy", function(){
					self._hasSelectorInputListener = false;
				});

				column.renderCell = function(object, value, cell, options, header){
					var row = object && self.row(object);
					value = row && self.selection[row.id];
					column._renderSelectorInput(column, value, cell, object);
				};

				column.renderHeaderCell = function(th){
					var label = "label" in column ? column.label : column.field || "";

					if(column._selectorType === "radio" || !self.allowSelectAll){
						th.appendChild(document.createTextNode(label));
						setupSelectionEvents(column);
					}else{
						column._selectorHeaderCheckbox = column._renderSelectorInput(column, false, th, {});
					}
				};
			}
		},

		_configColumns: function(prefix, columns){
			var columnArray = this.inherited(arguments);
			for(var i = 0, l = columnArray.length; i < l; i++){
				this._configureSelectorColumn(columnArray[i]);
			}
			return columnArray;
		},

		_handleSelect: function(event){
			// ignore the default select handler for events that originate from the selector column
			if(!this.cell(event).column.selector){
				this.inherited(arguments);
			}
		}
	});
});