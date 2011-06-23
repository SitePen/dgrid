define(["dojo/on", "xstyle/create"], function(on, create){

return function(column, editor, editOn){
    // summary:
    //      Add a column with text editing capability
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
                tabIndex: grid.tabIndex,
                value: value,
                checked: value
            });
            input.checked = value;
            input.value = value;
            input.lastValue = value;
            if(!grid._hasInputListener){
            	// register one listener at the top level that receives events delegated
            	grid._hasInputListener = true;
            	// note that we have to listen for clicks because IE doesn't fire change events properly for checkboxes, radios
            	grid.on("change,click", function(event){
            		var target = event.target;
	                if("lastValue" in target && target.className.indexOf("d-list-input") > -1){
	                    target.lastValue = setProperty(target.parentNode, target.lastValue, target[target.type == "checkbox" ? "checked" : "value"]);
	                }
	            });
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
            /*if(input.type == "checkbox" || input.type == "radio"){
                on(input, "keydown", function(event){
                    // bubble manually
                    on.emit(this.parentNode, "keydown", event);
                });
            }*/
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
    function setProperty(cell, oldValue, value){
    	if(oldValue != value){
	        var row = grid.row(cell);
	        if(column.field && row){
	            if(on.emit(cell, "datachange", {oldValue: oldValue, value: value, bubbles: true, cancelable: true})){
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
	                grid[value ? "selectAll" : "clearSelection"]();
	            }
	        }
    	}
        return value;
    }
    
    column.renderCell = function(object, value, cell, options){
        if(!grid){
            grid = column.grid;
            if(column.selector){
                grid.selection.watch(function(id, oldValue, newValue){
                    var cell = grid.cell(id, column.id);
                    cell.element.innerHTML = "";
                    renderWidget(newValue, cell.element, object);
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


