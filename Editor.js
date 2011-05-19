define(["dojo/listen"], function(listen){

return function(column, editor, editOn){
	// summary:
	// 		Add a column with text editing capability
	var originalRenderCell = column.renderCell || function(data, td){
		if(data != null){
			td.appendChild(document.createTextNode(data));
		}
	};
	column.editor = editor = editor || column.editor;
	column.editOn = editOn = editOn || column.editOn;
	var grid;
	var renderWidget = typeof editor == "string" ?
		function(data, cell, object, onblur){
			// it is string editor, so we use a common <input> as the editor
			var input = dojo.create("input",{
				type: editor,
				className: "dojoxGridxInput",
				name: column.field || "selection",
				value: data,
				checked: data
			}, cell);
			var id = grid.row(object).id;
			if(onblur){
				input.focus();
				input.onblur = function(){
					// delete the input now
					var thisInput = input;
					input = null;
					cell.removeChild(thisInput);
					onblur(data);
				};
			}
			input.onchange = function(){
				if(input){
					data = setProperty(cell, data, input[editor == "checkbox" ? "checked" : "value"]);
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
	column.renderCell = function(data, cell, options, object){
		grid = column.grid;
		if(column.editOn){
			listen(cell, column.editOn, function(){
				cell.innerHTML = "";
				renderWidget(data, cell, object, function(newData){
					originalRenderCell(data = newData, cell);
				});
			});
			originalRenderCell(data, cell);
		}else{
			renderWidget(data, cell, object);
		}
	}
	
	return column;
};
});


