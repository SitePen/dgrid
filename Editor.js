define(["dojo/on", "dojo/has", "dojo/_base/lang", "put-selector/put", "dojo/_base/sniff"],
function(on, has, lang, put){

var activeValues = [], // used to track active field's original/new values
	ignoreChange = false; // used to ignore change immediately after esc/enter

// common functions shared by all Editor "instances"

function setProperty(grid, cellElement, oldValue, value){
	if(oldValue != value){
		var cell = grid.cell(cellElement);
		var row = cell.row;
		var column = cell.column;
		if(column.field && row){
			// first try to keep the type the same if possible
			if(typeof oldValue == 'number'){
				value = isNaN(value) ? value : parseFloat(value);
			}else if(typeof oldValue == 'boolean'){
				value = value == 'true' ? true : value == 'false' ? false : value;
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

function renderInput(grid, column, value, cell, object, onblur){
	// Handler for simple HTML input fields
	var editOn = column.editOn,
		editor = column.editor,
		input = cell.input ||
			(cell.input = put(cell, "input[type=" + editor + "].dgrid-input", {
				name: column.field, // TODO: item id?
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
			}));
	
	input.value = value || "";
	if(editor == "radio" || editor == "checkbox"){ input.checked = value; }
	activeValues = [value, value]; // initialize old and new value for active field
	
	if(!grid._hasInputListener){
		// register one listener at the top level that receives events delegated
		grid._hasInputListener = true;
		grid.on("change", function(evt){ changeHandler(grid, evt); });
	}
	if(has("ie") < 9){
		// IE<9 doesn't fire change events for all the right things,
		// and it doesn't bubble, double fail.
		if(cell.input.type == "radio" || cell.input.type == "checkbox"){
			// listen for clicks because IE doesn't fire change events properly for checks/radios
			on(input, "click", function(evt){ changeHandler(grid, evt); });
		}else{
			on(input, "change", function(evt){ changeHandler(grid, evt); });
		}
	}
	if(onblur){
		// editor is not always-on (i.e. editOn was specified)
		var signal, stopper, keyHandler,
			inputBlurHandler = function(){
				// unhook and delete the input
				signal.remove();
				stopper && stopper.remove();
				keyHandler && keyHandler.remove();
				input.blur(); // force FF/IE to fire onchange first
				put(input, "!");
				cell.input = null;
				// pass new value to onblur handler
				onblur(activeValues[1]);
				ignoreChange = false;
			};
		
		input.focus();
		
		if(editOn){
			// don't allow event to confuse grid when editor is already active
			stopper = on(input, editOn, function(evt){
				evt.stopPropagation();
			});
			// hook up esc/enter handling
			keyHandler = on(input, "keydown", function(evt){
				dismissOnKey(column, evt) && inputBlurHandler();
			});
		}
		signal = on(input, "blur", inputBlurHandler);
	}
	return input;
}

function renderDijit(grid, column, data, cell, object, onblur){
	// Handler for Dijit-based editor fields
	var widget,
		editOn = column.editOn,
		// widgetArgs can be either a hash or a function returning a hash
		args = typeof column.widgetArgs == "function" ?
			lang.hitch(grid, column.widgetArgs)(object) : column.widgetArgs || {};
	
	args.value = data; // set value based on data
	activeValues = [data, data]; // initialize old and new value for active field
	
	widget = new column.editor(args, cell.appendChild(put("div")));
	widget.watch("value", function(key, oldValue, value){
		if(!widget.isValid || widget.isValid()){
			// only update internal value if widget is in a valid state
			if(activeValues[1] !== undefined){
				activeValues[1] = setProperty(grid, cell, activeValues[1], value);
			}
		}
	});
	if(onblur){
		// editor is not always-on (i.e. editOn was specified)
		var stopper,
			widgetBlurHandler = function(){
				// if widget supports validation and is invalid, don't dismiss
				// TODO: prevent from activating another field in the column?
				if(widget.isValid && !widget.isValid()){ return; }
				
				setTimeout(function(){
					// we have to wait on this for the widget will throw errors
					// about keydown events that happen right after blur
					stopper && stopper.remove();
					widget.destroyRecursive();
					// pass new value to onblur handler
					onblur(activeValues[1]);
					ignoreChange = false;
				}, 0);
			};
		
		widget.focus();
		
		if(editOn){
			// don't allow event to confuse grid when editor is already active
			stopper = on(widget.domNode, editOn, function(evt){
				evt.stopPropagation();
			});
		}
		widget.connect(widget, "onBlur", widgetBlurHandler);
		
		// connect key event handler for escape/enter cancel/confirm
		widget.connect(widget, "onKeyDown", function(evt){
			dismissOnKey(column, evt) && widgetBlurHandler();
		});
	}
	return widget;
}


return function(column, editor, editOn){
	// summary:
	//		Adds editing capability to a column's cells.
	
	var originalRenderCell = column.renderCell || function(object, value, td){
		if(value != null){
			td.appendChild(document.createTextNode(value));
		}
	};
	// accept arguments as parameters to Editor function, or from column def,
	// but normalize to column def.
	// (TODO: maybe should only accept from column def to begin with...)
	column.editor = editor || column.editor;
	column.editOn = editOn || column.editOn;
	
	// when editor is a string, we use a standard HTML input as the editor
	var renderEditor = typeof column.editor == "string" ? renderInput : renderDijit;
	
	column.renderCell = function(object, value, cell, options){
		var cmp, // stores input/widget being rendered
			grid = column.grid,
			editOn = column.editOn;
		
		if(editOn){ // TODO: Make this use event delegation, particularly now that we can do event delegation with focus events
			// if we are dealing with IE<8, the cell element is the padding cell, need to go to parent
			on(cell.tagName == "TD" ? cell : cell.parentNode,
					editOn, function(){
				if(!column.canEdit || column.canEdit(object, value)){
					cell.innerHTML = "";
					cmp = renderEditor(grid, column, value, cell, object, function(newData){
						originalRenderCell(object, value = newData, cell);
					});
					// if component is a widget, call startup now (already visible)
					if (cmp.startup) { cmp.startup(); }
				}
			});
			originalRenderCell(object, value, cell, options);
		}else{
			cmp = renderEditor(grid, column, value, cell, object);
			// if component is a widget, call startup once execution stack completes
			if (cmp.startup) { setTimeout(function(){ cmp.startup(); }, 0); }
		}
	};
	return column;
};
});
