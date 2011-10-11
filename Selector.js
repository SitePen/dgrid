define(["dojo/on", "dojo/aspect", "dojo/_base/sniff", "put-selector/put"], function(on, aspect, has, put){
	return function(column, type){
		// accept arguments as parameters to Selector function, or from column def
		column.type = type = type || column.type;
		column.sortable = false;

		var grid;
		function onchange(event){
			console.log("onchange", event);
			// event handler triggered on change of selector inputs
			var target = event.target;
			if(target.className.indexOf("dgrid-selector-input") > -1){
				var cellElement = target.parentNode,
					cell = grid.cell(cellElement),
					row = cell.row,
					column = cell.column,
					value = target.checked;

				if(type == "radio"){
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

		var selectorRE = /dgrid-selector-(cell|input)/;
		function onSelect(event){
			var match;
			if(!event._selected && (!event.ctrlKey || event.keyCode == 32) && (match = event.target.className.match(selectorRE))){
				console.log("onSelect", event.type, event._selected, event.timeStamp);
				var input;
				if(match[1] == "cell" && (input = event.target.firstChild) && input.nodeType == 1){
					var fireChange = true;
					if(type == "radio"){
						fireChange = !input.checked;
						input.checked = true;
					}else{
						input.checked = !input.checked;
					}
					fireChange && on.emit(input, "change", { bubbles: true, cancelable: true });
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
				on(this.contentNode, "mousedown,cellfocusin", onSelect);
			});
			grid.on(".dgrid-selector-input:change", onchange);
		}

		var renderInput = typeof type == "function" ? type : function(value, cell, object){
			var input = cell.input || (cell.input = put(cell, "input[type=" + type + "].dgrid-selector-input", {
				name: column.field || this.id + "-selection",
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
			}));
			input.value = value || "";
			input.checked = value;

			if(!grid._hasSelectionInputListener){
				setupSelectionEvents();
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

			return input;
		};

		var rowRE = /\bdgrid-row\b/,
			suppressSelect;
		column.renderCell = function(object, value, cell, options, header){
			if(!grid){
				grid = column.grid;
				grid.on("select,deselect", function(event){
					// Selector only cares about selection events from rows.
					// We can't just use event delegation here, because we *don't* want
					// to capture events bubbled from deeper (e.g. text editors).
					if(!suppressSelect && rowRE.test(event.target.className)){
						var cell = grid.cell(event.row.id, column.id).element;
						renderInput(event.type == "select", cell.contents || cell, object);
					}
				});
			}

			var row = object && grid.row(object);
			value = row && grid.selection[row.id];

			if(header && typeof object == "string"){
				cell.appendChild(document.createTextNode(object));
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
