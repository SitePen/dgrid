define(["dojo/on", "dojo/aspect", "dojo/_base/sniff", "put-selector/put", "dojo/query"], function(on, aspect, has, put, query){
	return function(column, type){
		// accept arguments as parameters to Selector function, or from column def
		column.type = type = type || column.type;
		column.sortable = false;

		var grid;
		function onSelect(event){
			if(event.type == "cellfocusin" && (event.parentType == "mousedown" || event.keyCode != 32)){
				// ignore "cellfocusin" from "mousedown" and any keystrokes other than spacebar
				return;
			}
			var row = grid.row(event);

			if(type == "radio"){
				grid.clearSelection();
				grid.select(row.id, null, true);
			}else{
				if(row){
					var lastRow = event.shiftKey ? grid.row(grid._lastSelected) : null;
					grid.select(row, lastRow||null, lastRow ? undefined : null);
					grid._lastSelected = row.element;
				}else{
					put(this, (grid.allSelected ? "!" : ".") + "dgrid-select-all");
					grid[grid.allSelected ? "clearSelection" : "selectAll"]();
				}
			}
		}

		function setupSelectionEvents(){
			// register one listener at the top level that receives events delegated
			grid._hasSelectorInputListener = true;
			aspect.around(grid, "_handleSelect", function(_handleSelect){
				return function(event, currentTarget){
					var target = event.target;
					while(!query.matches(target, ".dgrid-selector-cell", grid.contentNode)){
						if(target == grid.contentNode || !(target = target.parentNode)){
							break;
						}
					}
					if(!target || target == grid.contentNode){
						_handleSelect.call(this, event);
					}else{
						onSelect.call(target, event);
					}
				};
			});
			aspect.before(grid, "_initSelectionEvents", function(){
				on(this.headerNode, ".dgrid-selector-cell:mousedown,.dgrid-selector-cell:cellfocusin", onSelect);
			});
		}

		var renderInput = typeof type == "function" ? type : function(value, cell, object){
			var input = cell.input || (cell.input = put(cell, "div.ui-icon.dgrid-selector-input.dgrid-selector-"+type, {
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
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
		};

		var cn = column.className;
		column.className = "dgrid-selector-cell" + (cn ? "." + cn : "");

		return column;
	};
});
