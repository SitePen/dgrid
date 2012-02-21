define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/aspect",
	"dojo/has",
	"./Grid",
	"put-selector/put",
	"dojo/_base/sniff"
], function(kernel, lang, on, aspect, has, Grid, put){

var ignoreChange = false, // used to ignore change on native input after esc/enter
	activeCell; // tracks cell currently being edited

function updateInputValue(input, value){
	// common code for updating value of a standard input
	input.value = value;
	if(input.type == "radio" || input.type == "checkbox"){
		input.checked = !!value;
	}
}

function getProperty(column, cell){
	// common code for retrieving a property's value either from existing
	// dirty data, or from store data; used in showEditor.
	var grid = column.grid,
		row = grid.row(cell),
		field = column.field,
		dirty = grid.dirty && grid.dirty[row.id],
		value;
	
	value = (dirty && column.field in dirty) ? dirty[column.field] :
		column.get ? column.get(row.data) : row.data[column.field];
	console.log('getProperty: ', column.field, dirty, value);
	return value;
}

function setProperty(grid, cellElement, oldValue, value){
	// Updates dirty hash and fires dgrid-datachange event for a changed value.
	if(oldValue != value){
		var cell = grid.cell(cellElement);
		var row = cell.row;
		var column = cell.column;
		if(column.field && row){
			// first try to keep the type the same if possible
			if(typeof oldValue == "number"){
				value = isNaN(value) ? value : parseFloat(value);
			}else if(typeof oldValue == "boolean"){
				value = value == "true" ? true : value == "false" ? false : value;
			}else if(oldValue instanceof Date){
				var asDate = new Date(value);
				value = isNaN(asDate.getTime()) ? value : asDate;
			}
			// TODO: remove rowId in lieu of cell (or grid.row/grid.cell)
			// (keeping for the moment for back-compat, but will note in changes)
			if(on.emit(cellElement, "dgrid-datachange", {
						grid: this,
						cell: cell,
						rowId: row.id,
						oldValue: oldValue,
						value: value,
						bubbles: true,
						cancelable: true
					})){
				if (grid.setDirty){
					// for OnDemandGrid: update dirty data, and save if autoSave is true
					grid.setDirty(row.id, column.field, value);
					// perform auto-save (if applicable) in next tick to avoid
					// unintentional mishaps due to order of handler execution
					column.autoSave && setTimeout(function(){ grid._trackError("save"); }, 0);
				}
			}else{
				// else keep the value the same
				return oldValue;
			}
		}
	}
	return value;
}

function setPropertyFromWidget(grid, widget, value) {
	// This function serves as a window into setProperty for widget editors.
	var cellElement = widget.domNode.parentNode;
	if(!widget.isValid || widget.isValid()){ // only update if valid
		widget._dgridlastvalue = setProperty(
			grid, cellElement, widget._dgridlastvalue, value);
	}
}

// editor creation/hookup/placement logic

function createEditor(column){
	// Creates an editor instance based on column definition properties,
	// and hooks up events.
	var editor = column.editor,
		editOn = column.editOn,
		grid = column.grid,
		isWidget = typeof editor != "string", // string == standard HTML input
		args, cmp, node, putstr, handleChange;
	
	args = column.editorArgs || {};
	if(typeof args == "function"){ args = args.call(grid, column); }
	
	if(isWidget){
		cmp = new editor(args);
		node = cmp.focusNode || cmp.domNode;
		
		// Add dgrid-input to className to make consistent with HTML inputs.
		// (Can't do this using className argument to constructor; causes issues)
		node.className += " dgrid-input";
		
		// connect to onBlur rather than watching value for changes, since
		// the latter is delayed by setTimeouts and may also fire from our logic
		cmp.connect(cmp, "onBlur", function(){
			setPropertyFromWidget(grid, this, this.get("value"));
		});
	}else{
		handleChange = function(evt){
			var target = evt.target;
			if(ignoreChange){ return;	}
			
			if("_dgridlastvalue" in target && target.className.indexOf("dgrid-input") > -1){
				target._dgridlastvalue = setProperty(grid, target.parentNode, target._dgridlastvalue,
					target[target.type == "checkbox" || target.type == "radio"  ? "checked" : "value"]);
			}
		};

		// considerations for standard HTML form elements
		if(!column.grid._hasInputListener){
			// register one listener at the top level that receives events delegated
			grid._hasInputListener = true;
			grid.on("change", function(evt){ handleChange(evt); });
			// also register a focus listener
		}
		
		putstr = editor == "textarea" ? "textarea" :
			"input[type=" + editor + "]";
		cmp = node = put(putstr + ".dgrid-input", lang.mixin({
			name: column.field,
			tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
		}, args));
		
		if(has("ie") < 9){
			// IE<9 doesn't fire change events for all the right things,
			// and it doesn't bubble.
			// TODO: test IE9 quirks
			if(editor == "radio" || editor == "checkbox"){
				// listen for clicks since IE doesn't fire change events properly for checks/radios
				on(cmp, "click", function(evt){ handleChange(evt); });
			}else{
				on(cmp, "change", function(evt){ handleChange(evt); });
			}
		}
	}
	
	// XXX: stop mousedown propagation to prevent confusing Keyboard mixin logic
	// with certain widgets; perhaps revising KB's `handledEvent` would be better.
	on(node, "mousedown", function(evt){ evt.stopPropagation(); });
	
	return cmp;
}

function createSharedEditor(column, originalRenderCell){
	// Creates an editor instance with additional considerations for
	// shared usage across an entire column (for columns with editOn specified).
	
	var cmp = createEditor(column),
		isWidget = cmp.domNode,
		node = cmp.domNode || cmp,
		focusNode = cmp.focusNode || node,
		reset = isWidget ?
			function(){ cmp.set("value", cmp._dgridlastvalue); } :
			function(){ updateInputValue(cmp, cmp._dgridlastvalue); },
		keyHandle;
	
	function onblur(){
		var parentNode = node.parentNode;
		activeCell = null;
		
		// remove the editor from the cell
		parentNode.removeChild(node);
		
		// pass new value to original renderCell implementation for this cell
		originalRenderCell(column.grid.row(parentNode).data, cmp._dgridlastvalue,
			parentNode);
		
		column._editorBlurHandle.pause();
	}
	
	function dismissOnKey(evt){
		// Contains logic for reacting to enter/escape keypresses to save/cancel edits.
		// Returns boolean specifying whether this key event should dismiss the field.
		var key = evt.keyCode || evt.which;
		
		if(key == 27){ // escape: revert + dismiss
			ignoreChange = true;
			reset();
			focusNode.blur();
			ignoreChange = false;
		}else if(key == 13 && column.dismissOnEnter !== false){ // enter: dismiss
			// FIXME: Opera is "reverting" even in this case
			focusNode.blur();
		}
	}
	
	// hook up enter/esc key handling
	keyHandle = on(focusNode, "keydown", dismissOnKey);
	
	// hook up blur handler, but don't activate until widget is activated
	(column._editorBlurHandle = on.pausable(cmp, "blur", onblur)).pause();
	
	return cmp;
}

function showEditor(cmp, column, cell, value){
	// Places a shared editor into the newly-active cell in the column.
	var grid = column.grid,
		editor = column.editor,
		isWidget = cmp.domNode,
		row, field, dirty;
	
	// if showEditor is called from the editOn branch (shared editor),
	// need to grab latest value from data (dirty or otherwise)
	if(column.editOn){ value = getProperty(column, cell); }
	
	// for regular inputs, we can update the value before even showing it
	if(!isWidget){ updateInputValue(cmp, value); }
	
	cell.innerHTML = "";
	put(cell, cmp.domNode || cmp);
	
	if(isWidget){
		// for widgets, ensure startup is called before setting value,
		// to maximize compatibility with flaky widgets like dijit/form/Select
		if (!cmp._started){ cmp.startup(); }
		cmp.set("value", value);
	}
	// track previous value for short-circuiting or in case we need to revert
	cmp._dgridlastvalue = value;
}

// Editor column plugin function

return function(column, editor, editOn){
	// summary:
	//		Adds editing capability to a column's cells.
	
	var originalRenderCell = column.renderCell || Grid.defaultRenderCell,
		isWidget = typeof editor != "string",
		cleanupAdded;
	
	// accept arguments as parameters to Editor function, or from column def,
	// but normalize to column def.
	// (TODO: maybe should only accept from column def to begin with...)
	column.editor = editor = editor || column.editor;
	column.editOn = editOn = editOn || column.editOn;
	
	// warn for widgetArgs -> editorArgs; TODO: remove @ 1.0
	if (column.widgetArgs) {
		kernel.deprecated("column.widgetArgs", "use column.editorArgs instead",
			"dgrid 1.0");
		column.editorArgs = column.widgetArgs;
	}
	
	column.renderCell = editOn ? function(object, value, cell, options){
		// On first run, create one shared widget/input which will be swapped into
		// the active cell.
		if(!column.editorInstance){
			column.editorInstance = createSharedEditor(column, originalRenderCell);
		}
		
		if (!cleanupAdded && isWidget) {
			cleanupAdded = true;
			// clean up shared widget instance when the grid is destroyed
			aspect.before(column.grid, "destroy", function(){
				column.editorInstance.destroyRecursive();
			});
		}
		
		// TODO: Consider using event delegation
		// (Would require using dgrid's focus events for activating on focus,
		// which we already advocate in README for optimal use)
		
		// in IE<8, cell is the child of the td due to the extra padding node
		on(cell.tagName == "TD" ? cell : cell.parentNode,
				editOn, function(){
			var cmp = column.editorInstance;
			if(activeCell != this &&
					(!column.canEdit || column.canEdit(object, value))){
				activeCell = this;
				showEditor(cmp, column, cell);
				
				// focus / blur-handler-resume logic is surrounded in a setTimeout
				// to play nice with Keyboard's dgrid-cellfocusin as an editOn event
				setTimeout(function(){
					// focus the newly-placed control
					cmp.focus && cmp.focus(); // supported by form widgets and HTML inputs
					// resume blur handler once editor is focused
					column._editorBlurHandle && column._editorBlurHandle.resume();
				}, 0);
			}
		});
		// initially render content in non-edit mode
		return originalRenderCell(object, value, cell, options);
	} : function(object, value, cell, options){
		// always-on: create editor immediately upon rendering each cell
		var grid = column.grid,
			cmp = createEditor(column);
		showEditor(cmp, column, cell, value);
		
		if(isWidget){
			// maintain reference for later cleanup
			cell.widget = cmp;
			
			if(!cleanupAdded){
				cleanupAdded = true;
				
				// add advice for cleaning up widgets in this column
				aspect.before(grid, "removeRow", function(rowElement){
					// destroy our widget during the row removal operation
					var cellElement = grid.cell(rowElement, column.id).element,
						widget = (cellElement.contents || cellElement).widget;
					widget && widget.destroyRecursive();
				});
			}
		}
	};
	
	return column;
};
});
