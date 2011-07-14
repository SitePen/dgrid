define(["dojo/on", "dojo/has", "xstyle/put", "dojo/_base/sniff"], function(on, has, put){

return function(column, editor, editOn){
	// summary:
	//      Add a editing capability
	var originalRenderCell = column.renderCell || function(object, value, td){
		if(value != null){
			td.appendChild(document.createTextNode(value));
		}
	};
	column.editor = editor = editor || column.editor;
	column.editOn = editOn = editOn || column.editOn;
	function Column(){
		// we mask the null so it is not used by the widget
		this.id = null;
	}
	Column.prototype = column;
	var grid;
	function onchange(event){
		var target = event.target;
		if("lastValue" in target && target.className.indexOf("dgrid-input") > -1){
			target.lastValue = setProperty(target.parentNode, target.lastValue, target[target.type == "checkbox" || target.type == "radio"  ? "checked" : "value"]);
		}
	}
	var renderWidget = typeof editor == "string" ?
		function(value, cell, object, onblur){
			var input;
			// it is string editor, so we use a common <input> as the editor
			input = cell.input || (cell.input = put(cell, "input[type=" + editor + "].dgrid-input", {
				name: column.field || "selection",
				tabIndex: grid.tabIndex
			}));
			input.value = value || "";
			input.checked = value;
			input.lastValue = value;
			if(!grid._hasInputListener){
				// register one listener at the top level that receives events delegated
				grid._hasInputListener = true;
				// note that we have to listen for clicks because IE doesn't fire change events properly for checkboxes, radios
				grid.on("change", onchange);
			}
			if(has("ie")){
				// IE doesn't fire change events for all the right things, and it doesn't bubble, double fail.
				on(input, "change", onchange);
				on(input, "click", onchange);
			}
			if(onblur){
				input.focus();
				var signal = on(input, "blur", function(){
					// delete the input now
					signal.remove();
					cell.removeChild(input);
					onblur(input.lastValue);
				});
			}
		} :
		function(data, cell, object, onblur){
			// using a widget as the editor
			var widget = new editor(new Column, cell.appendChild(document.createElement("div")));
			widget.set("value", data);
			widget.watch("value", function(key, oldValue, value){
				data = setProperty(cell, data, value);
			});
			if(onblur){
				widget.focus();
				widget.connect(widget, "onBlur", function(){
					setTimeout(function(){
						// we have to wait on this for the widget will throw errors about keydown events that happen right after blur
						widget.destroy();
					}, 0);
					onblur(data);
				});
			}
		};
	function setProperty(cellElement, oldValue, value){
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
				if(on.emit(cellElement, "datachange", {oldValue: oldValue, value: value, bubbles: true, cancelable: true})){
					var object = row.data;
					var dirty = grid.dirty[row.id] || (grid.dirty[row.id] = {});
					dirty[column.field] = object[column.field] = value;
					if(column.autoSave){
						grid.save();
					}
				}else{
					// else keep the value the same
					return oldValue;
				}   
			}
			if(column.selector){
				if(editor == "radio" || column.selector == "single"){
					grid.clearSelection();
				}
				if(row){
					suppressSelect = true;
					grid.select(row.id, null, value);
					suppressSelect = false;
				}else{
					// select all
					grid[value ? "selectAll" : "clearSelection"]();
				}
			}
		}
		return value;
	}
	var suppressSelect;
	column.renderCell = function(object, value, cell, options){
		if(!grid){
			grid = column.grid;
			if(column.selector){
				grid.on("select,deselect", function(event){
					if(!suppressSelect){
						var cell = grid.cell(event.row.id, column.id);
						renderWidget(event.type == "select", cell.element, object);
					}
				});
			}
		}
		value = !column.selector && value;
		if(column.editOn){
			on(cell, column.editOn, function(){
				if(!column.canEdit || column.canEdit(object, value)){
					cell.innerHTML = "";
					renderWidget(value, cell, object, function(newData){
						originalRenderCell(object, value = newData, cell);
					});
				}
			});
			originalRenderCell(object, value, cell, options);
		}else{
			renderWidget(value, cell, object);
		}
	}
	if(!column.name){
		column.renderHeaderCell = function(th){
			column.renderCell({}, null, th);
		}
	}
	return column;
};
});
