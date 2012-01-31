define(["dojo/on", "dojo/has", "dojo/_base/lang", "put-selector/put", "dojo/aspect", "dojo/_base/sniff"],
function(on, has, lang, put, aspect){

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

function changeHandler(grid, event){
	// event handler triggered on change of common input elements
	var target = event.target;
	if("lastValue" in target && target.className.indexOf("dgrid-input") > -1){
		target.lastValue = setProperty(grid, target.parentNode, target.lastValue,
			target[target.type == "checkbox" || target.type == "radio"  ? "checked" : "value"]);
	}
}

function renderInput(grid, column, value, cell, object, onblur){
	// Handler for simple HTML input fields
	var editOn = column.editOn,
		input = cell.input ||
			(cell.input = put(cell, "input[type=" + column.editor + "].dgrid-input", {
				name: column.field || this.id + "-selection",
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
			}));
	
	input.value = value || "";
	input.checked = value;
	input.lastValue = value;
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
		var signal, stopper;
		
		input.focus();
		
		if(editOn){
			// don't allow event to confuse grid when editor is already active
			stopper = on(input, editOn, function(evt){
				evt.stopPropagation();
			});
		}
		signal = on(input, "blur", function(){
			// unhook and delete the input now
			signal.remove();
			stopper && stopper.remove();
			put(input, "!");
			cell.input = null;
			onblur(input.lastValue);
		});
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
	// instantiate the widget, and store a reference to it so we can delete it later
	cell.widget = widget = new column.editor(args, put(cell, "div"));
	widget.watch("value", function(key, oldValue, value){
		data = setProperty(grid, cell, data, value);
	});
	if(onblur){
		// editor is not always-on (i.e. editOn was specified)
		var stopper;
		widget.focus();
		
		if(editOn){
			// don't allow event to confuse grid when editor is already active
			stopper = on(widget.domNode, editOn, function(evt){
				evt.stopPropagation();
			});
		}
		widget.connect(widget, "onBlur", function(){
			// if widget supports validation and is invalid, don't dismiss
			if(widget.isValid && !widget.isValid()){ return; }
			
			setTimeout(function(){
				// we have to wait on this for the widget will throw errors
				// about keydown events that happen right after blur
				stopper && stopper.remove();
				widget.destroyRecursive();
				onblur(data);
			}, 0);
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
		if(renderEditor == renderDijit && !column._dijitCleanup){
			// just need to add this once
			column._dijitCleanup = true;
			// add advice for cleaning up this cell
			aspect.before(grid, "removeRow", function(rowElement){
				// destroy our widget during the row removal operation
				var cellElement = grid.cell(rowElement, column.id).element;
				var widget = (cellElement.contents || cellElement).widget;
				// widget may not have been created if editOn is used
				widget && widget.destroyRecursive();
			});
		}		
		
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
