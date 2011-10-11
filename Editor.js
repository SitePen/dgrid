define(["dojo/on", "dojo/has", "dojo/_base/lang", "put-selector/put", "dojo/_base/sniff"], function(on, has, lang, put){

return function(column, editor, editOn){
	// summary:
	//		Adds editing capability to a column's cells.
	
	var originalRenderCell = column.renderCell || function(object, value, td){
		if(value != null){
			td.appendChild(document.createTextNode(value));
		}
	};
	// accept arguments as parameters to Editor function, or from column def
	column.editor = editor = editor || column.editor;
	column.editOn = editOn = editOn || column.editOn;
	
	var grid;
	function onchange(event){
		// event handler triggered on change of common input elements
		var target = event.target;
		if("lastValue" in target && target.className.indexOf("dgrid-input") > -1){
			target.lastValue = setProperty(target.parentNode, target.lastValue,
				target[target.type == "checkbox" || target.type == "radio"  ? "checked" : "value"]);
		}
	}
	
	var renderWidget = typeof editor == "string" ?
		function(value, cell, object, onblur){
			// when editor is a string, we use a common <input> as the editor
			var input = cell.input || (cell.input = put(cell, "input[type=" + editor + "].dgrid-input", {
				name: column.field || this.id + "-selection",
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
			}));
			input.value = value || "";
			input.checked = value;
			input.lastValue = value;
			if(!grid._hasInputListener){
				// register one listener at the top level that receives events delegated
				grid._hasInputListener = true;
				grid.on("change", onchange);
			}
			if(has("ie") < 9){
				// IE<9 doesn't fire change events for all the right things,
				// and it doesn't bubble, double fail.
				if(cell.input.type == "radio" || cell.input.type == "checkbox"){
					// listen for clicks because IE doesn't fire change events properly for checks/radios
					on(input, "click", onchange);
				}else{
					on(input, "change", onchange);
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
		} :
		function(data, cell, object, onblur){
			// using a widget as the editor.
			var
				// widgetArgs can be either a hash or a function returning a hash
				args = typeof column.widgetArgs == "function" ?
					lang.hitch(grid, column.widgetArgs)(object) : column.widgetArgs || {},
				widget;
			args.value = data; // set value based on data
			widget = new editor(args, cell.appendChild(put("div")));
			widget.watch("value", function(key, oldValue, value){
				data = setProperty(cell, data, value);
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
				if(on.emit(cellElement, "datachange", {rowId: row.id, oldValue: oldValue, value: value, bubbles: true, cancelable: true})){
					var
						dirty = grid.dirty[row.id],
						object = row.data;
					if(!dirty){
						dirty = grid.dirty[row.id] = {};
						if(!column.autoSave){
							// Use delegate to protect original data item in non-autoSave case
							// (i.e. to "protect" items of in-memory stores until save).
							// This way, row.data will still reflect up to date information
							// reflecting grid edits, without "corrupting" store items.
							object = row.data = lang.delegate(row.data, dirty);
						}
					}
					dirty[column.field] = object[column.field] = value;
					if(column.autoSave){
						grid.save();
					}
				}else{
					// else keep the value the same
					return oldValue;
				}   
			}
		}
		return value;
	}
	var suppressSelect;
	column.renderCell = function(object, value, cell, options){
		var cmp; // stores input/widget being rendered
		if(!grid){
			grid = column.grid;
		}
		if(column.editOn){ // TODO: Make this use event delegation, particularly now that we can do event delegation with focus events
			// if we are dealing with IE<8, the cell element is the padding cell, need to go to parent
			on(cell.tagName == "TD" ? cell : cell.parentNode,
					column.editOn, function(){
				if(!column.canEdit || column.canEdit(object, value)){
					cell.innerHTML = "";
					cmp = renderWidget(value, cell, object, function(newData){
						originalRenderCell(object, value = newData, cell);
					});
					// if component is a widget, call startup now (already visible)
					if (cmp.startup) { cmp.startup(); }
				}
			});
			originalRenderCell(object, value, cell, options);
		}else{
			cmp = renderWidget(value, cell, object);
			// if component is a widget, call startup once execution stack completes
			if (cmp.startup) { setTimeout(function(){ cmp.startup(); }, 0); }
		}
	}
	if(!column.label){
		column.renderHeaderCell = function(th){
			column.renderCell({}, null, th);
		}
	}
	return column;
};
});
