define(["dojo/on", "cssx/create"], function(on, create){

return function(column, editor, editOn){
	// summary:
	// 		Add a column with text editing capability
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
	var renderWidget = typeof editor == "string" ?
		function(value, cell, object, onblur){
			// it is string editor, so we use a common <input> as the editor
			var input = create(cell, "input[type=" + editor + "].d-list-input", {
				name: column.field || "selection",
				value: value,
				checked: value
			});
			if(onblur){
				input.focus();
				input.onblur = function(){
					// delete the input now
					input.onblur = null;
					var thisInput = input;
					input = null;
					cell.removeChild(thisInput);
					onblur(value);
				};
			}
			if(input.type == "checkbox" || input.type == "radio"){
				input.onkeydown = function(event){
					// bubble manually
					on.emit(this.parentNode, "keydown", event);
				}
			}
			input.onchange = function(){
				if(input){
					value = setProperty(cell, value, input[editor == "checkbox" ? "checked" : "value"]);
				}
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
					widget.destroy();
					onblur(data);
				});
			}
		};
	function setProperty(cell, oldValue, value){
		var row = grid.row(cell);
		if(column.field){
			if(on.emit(cell, "change", {oldValue: oldValue, value: value, bubbles: true, cancelable: true})){
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
				grid.selection.set(row.id, value);
			}else{
				// select all
				grid.selectAll();
			}
		}
		return value;
	}
	
	column.renderCell = function(object, value, cell, options){
		if(!grid){
			grid = column.grid;
			if(column.selector){
				grid.selection.watch(function(id, oldValue, newValue){
					var row = grid.row(id);
					var cell = row.cell(column.id);
					cell.innerHTML = "";
					renderCell(row.data, newValue, cell, {});
				});
			}
		}
		value = !column.selector && value;
		if(column.editOn){
			on(cell, column.editOn, function(){
				cell.innerHTML = "";
				renderWidget(value, cell, object, function(newData){
					originalRenderCell(object, value = newData, cell);
				});
			});
			originalRenderCell(object, value, cell, options);
		}else{
			renderWidget(value, cell, object);
		}
	}
	if(!column.name){
		column.renderHeaderCell = function(th){
			renderWidget(null, th);
		}
	}
	return column;
};
});


