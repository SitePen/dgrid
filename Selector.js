define(["dojo/on", "dojo/aspect", "dojo/_base/sniff", "put-selector/put"], function(on, aspect, has, put){
	return function(column, type){
		// accept arguments as parameters to Selector function, or from column def
		column.type = type = type || column.type;
		column.sortable = false;

		var grid;
		function onSelect(event){
			if(!event._selected && (!event.ctrlKey || event.keyCode == 32)){
				var row = grid.row(event),
					value = null;
				if(type == "radio"){
					grid.clearSelection();
					value = true;
				}

				if(row){
					grid.select(row.id, null, value);
				}else if(type != "radio"){
					put(this, (grid.allSelected ? "!" : ".") + "dgrid-select-all");
					grid[grid.allSelected ? "clearSelection" : "selectAll"]();
				}
				event._selected = true;
				return;
			}
		}

		function setupSelectionEvents(){
			// register one listener at the top level that receives events delegated
			grid._hasSelectionInputListener = true;
			aspect.before(grid, "_initSelectionEvents", function(){
				// Add listeners for these events before Selection adds its own
				// so we can short-circuit what Selection will do
				on(this.contentNode, ".dgrid-selector-cell:mousedown,.dgrid-selector-cell:cellfocusin", onSelect);
				on(this.headerNode, ".dgrid-selector-cell:mousedown,.dgrid-selector-cell:cellfocusin", onSelect);
			});
		}

		var renderInput = typeof type == "function" ? type : function(value, cell, object){
			var input = cell.input || (cell.input = put(cell, "div.ui-icon.dgrid-selector-input.dgrid-selector-"+type, {
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
			}));

			if(!grid._hasSelectionInputListener){
				setupSelectionEvents();
			}

			return input;
		};

		var rowRE = /\bdgrid-row\b/;
		column.renderCell = function(object, value, cell, options, header){
			if(!grid){
				grid = column.grid;
			}

			var row = object && grid.row(object);
			value = row && grid.selection[row.id];

			if(header && (type == "radio" || typeof object == "string")){
				cell.appendChild(document.createTextNode(object||""));
				if(!grid._hasSelectionInputListener){
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
