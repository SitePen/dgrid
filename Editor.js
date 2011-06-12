define(["dojo/on", "cssx/create"], function(listen, create){

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
	var grid;
	var renderWidget = typeof editor == "string" ?
		function(value, cell, object, onblur){
			// it is string editor, so we use a common <input> as the editor
			var input = create(cell, "input[type=" + editor + "].d-list-input", {
				name: column.field || "selection",
				value: value,
				checked: value
			});
			var id = grid.row(object).id;
			if(onblur){
				input.focus();
				input.onblur = function(){
					// delete the input now
					var thisInput = input;
					input = null;
					cell.removeChild(thisInput);
					onblur(value);
				};
			}
			input.onchange = function(){
				if(input){
					value = setProperty(cell, value, input[editor == "checkbox" ? "checked" : "value"]);
				}
			}
		} :
		function(data, cell, object, onblur){
			// using a widget as the editor
			var widget = new editor(column, cell.appendChild(document.createElement("div")));
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
			if(listen.emit(cell, "change", {oldValue: oldValue, value: value, bubbles: true, cancelable: true})){
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
			grid.selection.set(row.id, value);
		}
		return value;
	}
	column.renderCell = function(object, value, cell, options){
		grid = column.grid;
		if(column.editOn){
			listen(cell, column.editOn, function(){
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
	
	return column;
};
});


