define(["dojo/on", "dojo/aspect", "dojo/_base/sniff", "put-selector/put"], function(on, aspect, has, put){
	return function(column, type){
		// accept arguments as parameters to Selector function, or from column def
		column.type = type = type || column.type;
		column.sortable = false;
		
		var grid, recentInput, recentTimeout, headerCheckbox;
		function changeInput(value){
			// creates a function that modifies the input on an event
			return function(event){
				var element = grid.cell(event.row, column.id).element;
				element = (element.contents || element).input;
				if(!element.disabled){
					// only change the value if it is not disabled
					element.checked = value;
				}
				// see if the header checkbox needs to be indeterminate
				var mixed = false;
				var selection = grid.selection; 
				for(var i in selection){
					// if there is anything in the selection, than it is indeterminate
					if(selection[i] != grid.allSelected){
						mixed = true;
						break;
					}
				}
				headerCheckbox.indeterminate = mixed;
				headerCheckbox.checked = grid.allSelected;
				
				// we record the most recent event to avoid undoing it in the next event (click)
				recentInput = element;
				clearTimeout(recentTimeout);
				recentTimeout = setTimeout(function(){
					// the most intuitive way to determine if the next event should be 
					// cancelled seems more to do with time than any sequence of events,
					// after a short pause a user naturally beings to expect that their
					// next action (releasing the mouse) will have an affect. 
					recentInput = false;
				}, 500);
			};
		}

		function onSelect(event){
			if(recentInput == this){
				// an event recently occurred on this input so we cancel it so we don't have the click undoing the selection
				return event.preventDefault();
			}
			// we would really only care about click, since other input sources, like spacebar
			// trigger a click, but the click event doesn't provide access to the shift key in firefox, so
			// listen for keydown's as well to get an event in firefox that we can properly retrieve
			// the shiftKey property from
			if(event.type == "click" || event.keyCode == 32){ 
				var row = grid.row(event), lastRow = grid._lastSelected && grid.row(grid._lastSelected);
	
				if(type == "radio"){
					if(!lastRow || lastRow.id != row.id){
						grid.clearSelection();
						grid.select(row, null, true);
						grid._lastSelected = row.element;
					}
				}else{
					if(row){
						if(event.shiftKey){
							// make sure the last input always ends up checked for shift key 
							changeInput(true)({row: row});
						}else{
							// no shift key, so no range selection
							lastRow = null;
						}
						lastRow = event.shiftKey ? lastRow : null;
						grid.select(lastRow|| row, row, lastRow ? undefined : null);
						grid._lastSelected = grid.selectionMode != "single" && row.element;
					}else{
						put(this, (grid.allSelected ? "!" : ".") + "dgrid-select-all");
						grid[grid.allSelected ? "clearSelection" : "selectAll"]();
					}
				}
			}
		}

		function setupSelectionEvents(){
			// register one listener at the top level that receives events delegated
			grid._hasSelectorInputListener = true;
			aspect.before(grid, "_initSelectionEvents", function(){
				this.on(".dgrid-selector-input:click,.dgrid-selector-input:keydown", onSelect);
			});
			if(typeof column.disabled == "function"){
				var originalAllowSelect = grid.allowSelect;
				grid.allowSelect = function(row){
					return originalAllowSelect.call(this, row) && !column.disabled(row.data);
				};
			}
			// register listeners to the select and deselect events to change the input checked value
			grid.on("dgrid-select", changeInput(true));
			grid.on("dgrid-deselect", changeInput(false));
		}
		
		var disabled = column.disabled;
		var renderInput = typeof type == "function" ? type : function(value, cell, object){
			var input = cell.input || (cell.input = put(cell, "input.dgrid-selector-input[type="+type + "]", {
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex,
				disabled: disabled && (typeof disabled == "function" ? disabled(object) : disabled),
				checked: value,
				lastValue: true // signals to the Keyboard.js to focus on it
			}));

			if(!grid._hasSelectorInputListener){
				setupSelectionEvents();
			}

			return input;
		};

		column.renderCell = function(object, value, cell, options, header){
			if(!grid){
				grid = column.grid;
			}

			var row = object && grid.row(object);
			value = row && grid.selection[row.id];

			if(header && (type == "radio" || typeof object == "string")){
				cell.appendChild(document.createTextNode(object||""));
				if(!grid._hasSelectorInputListener){
					setupSelectionEvents();
				}
			}else{
				renderInput(value, cell, object);
			}
		};
		column.renderHeaderCell = function(th){
			column.renderCell(column.label || {}, null, th, null, true);
			headerCheckbox = th.lastChild;
		};

		return column;
	};
});
