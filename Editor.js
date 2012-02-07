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

var ignoreChange = false; // used to ignore change on native input after esc/enter

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
					column.autoSave && grid._trackError("save");
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
	if(!widget.isValid || widget.isValid()){ // only update if valid
		widget._dgridlastvalue = setProperty(
			grid, widget.domNode.parentNode, widget._dgridlastvalue, value);
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
		args, cmp, node, className, putstr, handleChange;
	
	// TODO: deprecate widgetArgs in favor of editorArgs
	// (leaving open the possibility of using it for HTML textarea, etc)
	args = column.editorArgs || column.widgetArgs || {};
	if(typeof args == "function"){ args = args.call(grid, column); }
	
	if(isWidget){
		cmp = new editor(args);
		
		// Add dgrid-input to className to make consistent with HTML inputs.
		// (Can't do this using className argument to constructor; causes issues)
		(cmp.focusNode || cmp.domNode).className += " dgrid-input";
		
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
		cmp = put(putstr + ".dgrid-input", lang.mixin({
			name: column.field, // TODO: item id?
			tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
		}, args));
		
		if(has("ie") < 9){
			// IE<9 doesn't fire change events for all the right things,
			// and it doesn't bubble.
			// TODO: test IE9 quirks
			// FIXME: blowing up here!
			if(editor == "radio" || editor == "checkbox"){
				// listen for clicks since IE doesn't fire change events properly for checks/radios
				on(cmp, "click", function(evt){ handleChange(evt); });
			}else{
				on(cmp, "change", function(evt){ handleChange(evt); });
			}
		}
	}
	
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
			function(){ cmp.value = cmp._dgridlastvalue; },
		stopper, keyHandle, blurHandle;
	
	function onblur(){
		var parentNode = node.parentNode;
		
		// FIXME: currently having problems due to blur being multi-fired
		// (Wasn't an issue previously because the listener was already unhooked)
		
		// remove the editor from the cell
		parentNode.removeChild(node);
		
		// pass new value to original renderCell implementation for this cell
		//TODO: test; is the cost of grid.row() worth hooking this centrally?
		//(maybe expand info about active editor instead?)
		originalRenderCell(column.grid.row(parentNode).data, cmp._dgridlastvalue,
			parentNode);
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
			focusNode.blur();
		}
	}
	
	// don't allow event to confuse grid when editor is already active
	// TODO: delegate from bodyNode via `.column-<id> .dgrid-input`?
	//	(only if we also delegate initial editOn events...)
	stopper = on(node, column.editOn, function(evt){
		evt.stopPropagation();
	});
	
	// hook up enter/esc key handling
	keyHandle = on(focusNode, "keydown", dismissOnKey);
	
	if(isWidget){
		// need to further wrap blur callback, to check for validity first,
		// and to add a timeout to avoid throwing errors for key events after blur
		// (TODO: verify if the timeout is still needed since we no longer destroy)
		blurHandle = on.pausable(cmp, "blur", function(){
			if(cmp.isValid && !cmp.isValid()){ return; }
			onblur();
		});
	}else{
		blurHandle = on.pausable(node, "blur", onblur);
	}
	
	return cmp;
}

function showEditor(cmp, column, value, cell, object){
	// Places a shared editor into the newly-active cell in the column.
	var grid = column.grid,
		editor = column.editor,
		editOn = column.editOn,
		isWidget = cmp.domNode;
	
	// update value of input/widget first
	if(isWidget){
		cmp.set("value", value);
	}else{
		cmp.value = value;
		if(editor == "radio" || editor == "checkbox"){ cmp.checked = !!value; }
	}
	// track previous value for short-circuiting or in case we need to revert
	cmp._dgridlastvalue = value;
	
	cell.innerHTML = "";
	put(cell, cmp.domNode || cmp);
	// if component is a widget, call startup if this is the first placement
	if(isWidget && !cmp._started){ cmp.startup(); }
}

// Editor column plugin function

return function(column, editor, editOn){
	// summary:
	//		Adds editing capability to a column's cells.
	
	var originalRenderCell = column.renderCell || Grid.defaultRenderCell;
	
	// accept arguments as parameters to Editor function, or from column def,
	// but normalize to column def.
	// (TODO: maybe should only accept from column def to begin with...)
	column.editor = editor = editor || column.editor;
	column.editOn = editOn = editOn || column.editOn;
	
	column.renderCell = function(object, value, cell, options){
		var cmp, // stores input/widget rendered in non-editOn code path
			grid = column.grid,
			isWidget = typeof editor != "string";
		
		if(isWidget && !column._dijitCleanup){
			// add advice for cleaning up widgets in this column
			column._dijitCleanup = true;
			
			aspect.before(grid, "removeRow", function(rowElement){
				// destroy our widget during the row removal operation
				var cellElement = grid.cell(rowElement, column.id).element;
				var widget = (cellElement.contents || cellElement).widget;
				// widget may not have been created if editOn is used
				widget && widget.destroyRecursive();
			});
		}		
		
		if(editOn){
			// On first run, create one shared widget/input which will be swapped into
			// the active cell.
			if(!column.editorInstance){
				column.editorInstance = createSharedEditor(column, originalRenderCell);
				
				if (isWidget) {
					// clean up shared widget instance when the grid is destroyed
					aspect.before(grid, "destroy", function(){
						column.editorInstance.destroyRecursive();
					});
				}
			}
			
			// TODO: Consider using event delegation
			// (Would require using dgrid's focus events for activating on focus,
			// which we already advocate in README for optimal use)
			
			// in IE<8, cell is the child of the td due to the extra padding node
			on(cell.tagName == "TD" ? cell : cell.parentNode,
					editOn, function(){
				var cmp = column.editorInstance;
				if(!column.canEdit || column.canEdit(object, value)){
					showEditor(cmp, column, value, cell, object);
					// focus the newly-placed control
					cmp.focus && cmp.focus(); // supported by form widgets and HTML inputs
				}
			});
			// initially render content in non-edit mode
			originalRenderCell(object, value, cell, options);
		}else{
			// always-on: create editor immediately upon rendering each cell
			cmp = createEditor(column);
			showEditor(cmp, column, value, cell, object);
			
			if(isWidget){
				// maintain reference for later cleanup
				cell.widget = cmp;
				// call widget's startup once execution stack completes
				setTimeout(function(){ cmp.startup(); }, 0);
			}
		}
	};
	return column;
};
});
