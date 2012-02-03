define(["dojo/_base/kernel", "dojo/on", "dojo/has", "dojo/_base/lang", "./Grid", "put-selector/put", "dojo/_base/sniff"],
function(kernel, on, has, lang, Grid, put){

var activeValues = [], // used to track active field's original/new values
	ignoreChange = false; // used to ignore change immediately after esc/enter

function setProperty(grid, cellElement, oldValue, value){
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
			if(on.emit(cellElement, "dgrid-datachange", {
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

// general event logic

function changeHandler(grid, evt){
	// event handler triggered on change of common input elements
	var target = evt.target;
	if(ignoreChange){ return;	}
	
	if(activeValues[0] !== undefined && target.className.indexOf("dgrid-input") > -1){
		activeValues[1] = setProperty(grid, target.parentNode, activeValues[1],
			target[target.type == "checkbox" || target.type == "radio"  ? "checked" : "value"]);
	}
}

function dismissOnKey(column, evt){
	// Contains logic for reacting to enter/escape keypresses to save/cancel edits.
	// Returns boolean specifying whether this key event should dismiss the field.
	var key = evt.keyCode || evt.which;
	
	if (key == 27){ // escape: revert + dismiss
		activeValues[1] = activeValues[0];
		ignoreChange = true;
		return true;
	}else if (key == 13 && column.dismissOnEnter !== false){ // enter: dismiss
		return true;
	}
	return false; // don't dismiss
}

// editor creation/hookup/placement logic

function createEditor(column){
	// Creates an editor instance based on column definition properties,
	// and hooks up events.
	var editor = column.editor,
		editOn = column.editOn,
		grid = column.grid,
		isWidget = typeof editor != "string", // string == standard HTML input
		args, cmp, node, className, putstr;
	
	// TODO: deprecate widgetArgs in favor of editorArgs
	// (leaving open the possibility of using it for HTML textarea, etc)
	args = column.editorArgs || column.widgetArgs || {};
	if(typeof args == "function"){ args = args.call(grid, column); }
	
	if(isWidget){
		// add dgrid-input to className to make consistent with HTML inputs
		className = args.className;
		args.className = (className ? className + " " : "") + "dgrid-input";
		
		cmp = new editor(args);
		cmp.watch("value", function(key, oldValue, value){
			// only update internal value if widget is in a valid state
			if(!this.isValid || this.isValid()){
				if(activeValues[1] !== undefined){
					activeValues[1] = setProperty(
						grid, this.domNode.parentNode, activeValues[1], value);
				}
			}
		});
	}else{
		// considerations for standard HTML form elements
		if(!column.grid._hasInputListener){
			// register one listener at the top level that receives events delegated
			grid._hasInputListener = true;
			grid.on("change", function(evt){ changeHandler(grid, evt); });
		}
		if(has("ie") < 9){
			// IE<9 doesn't fire change events for all the right things,
			// and it doesn't bubble.
			// TODO: test IE9 quirks
			if(editor == "radio" || editor == "checkbox"){
				// listen for clicks since IE doesn't fire change events properly for checks/radios
				on(cmp, "click", function(evt){ changeHandler(grid, evt); });
			}else{
				on(cmp, "change", function(evt){ changeHandler(grid, evt); });
			}
		}
		
		putstr = editor == "textarea" ? "textarea" :
			"input[type=" + editor + "]";
		cmp = put(putstr + ".dgrid-input", lang.mixin({
			name: column.field, // TODO: item id?
			tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
		}, args));
	}
	
	return cmp;
}

function createSharedEditor(column, originalRenderCell){
	// Creates an editor instance with additional considerations for
	// shared usage across an entire column (for columns with editOn specified).
	
	var cmp = createEditor(column),
		isWidget = cmp.domNode,
		node = cmp.domNode || cmp,
		parentNode,
		stopper, keyHandler, blurHandler,
		onblur = function(){
			// FIXME: currently having problems due to blur being multi-fired
			// (Wasn't an issue previously because the listener was already unhooked)
			
			// force FF/IE to fire onchange first when fired from esc/enter
			node.blur();
			
			// remove the editor from the cell
			parentNode = node.parentNode;
			parentNode.removeChild(node);
			
			// pass new value to original renderCell implementation for this cell
			//TODO: test; is the cost of grid.row() worth hooking this centrally?
			//(maybe expand info about active editor instead?)
			originalRenderCell(column.grid.row(parentNode).data, activeValues[1],
				parentNode);
			
			// reset state
			ignoreChange = false;
			activeValues = [];
		};
	
	// don't allow event to confuse grid when editor is already active
	// TODO: delegate from bodyNode via `.column-<id> .dgrid-input`?
	//	(only if we also delegate initial editOn events...)
	stopper = on(node, column.editOn, function(evt){
		evt.stopPropagation();
	});
	
	// hook up enter/esc key handling
	// TODO: test for various input widgets - is domNode good enough?
	keyHandler = on(node, "keydown", function(evt){
		dismissOnKey(column, evt) && onblur();
	});
	
	if(isWidget){
		// need to further wrap blur callback, to check for validity first,
		// and to add a timeout to avoid throwing errors for key events after blur
		// (TODO: verify if the timeout is still needed since we no longer destroy)
		cmp.connect(cmp, "onBlur", function(){
			if(cmp.isValid && !cmp.isValid()){ return; }
			setTimeout(onblur, 0);
		});
	}else{
		blurHandler = on(node, "blur", onblur);
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
	column.editor = editor || column.editor;
	column.editOn = editOn || column.editOn;
	
	column.renderCell = function(object, value, cell, options){
		var cmp, // stores input/widget component being rendered
			grid = column.grid;
		
		if(editOn){
			// On first run, create one shared widget/input which will be swapped into
			// the active cell.
			if(!column.editorInstance){
				column.editorInstance = createSharedEditor(column, originalRenderCell);
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
					// initialize old and new value for active field
					activeValues = [value, value];
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
			// if component is a widget, call startup once execution stack completes
			if (cmp.startup) { setTimeout(function(){ cmp.startup(); }, 0); }
		}
	};
	return column;
};
});
