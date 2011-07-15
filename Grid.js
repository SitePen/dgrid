define(["dojo/has", "xstyle/put", "dojo/_base/declare", "dojo/on", "./Editor", "./List", "dojo/_base/sniff"], function(has, put, declare, listen, Editor, List){
	return declare([List], {
		columns: {},
		// summary:
		//		This indicates that focus is at the cell level. This may be set to false to cause
		//		focus to be at the row level, which is useful if you want only want row-level
		//		navigation.
		cellNavigation: true,
		column: function(target){
			// summary:
			//		Get the column object by node, or event, or a columnId
			if(typeof target == "string"){
				var subrows = getSubrows(this);
				for(var si = 0, sl = subrows.length; si < sl; si++){
					var column = subrows[si][target];
					if(column) {
						return column;
					}
				}
			}else{
				return this.cell(target).column;
			}
		},
		cell: function(target, columnId){
			// summary:
			//		Get the cell object by node, or event, id, plus a columnId
			if(target.target && target.target.nodeType == 1){
				// event
				target = target.target;
			}
			var element;
			if(target.nodeType == 1){
				var object;
				do{
					if(this._rowIdToObject[target.id]){
						break;
					}
					var colId = target.columnId;
					if(colId){
						columnId = colId;
						element = target;
						break;
					}
					target = target.parentNode;
				}while(target && target != this.domNode);
			}
			if(!element && columnId){
				var row = this.row(target),
					rowElement = row.element;
				if(rowElement){ 
					var elements = rowElement.getElementsByTagName("td");
					for(var i = 0; i < elements.length; i++){
						if(elements[i].columnId == columnId){
							element = elements[i];
							break;
						}
					}
				}
			}
			if(target != null){
				return {
					row: row || this.row(target),
					column: columnId && this.column(columnId),
					element: element
				};
			}
		},
		_columnsCss: function(rule){
			// This is an attempt at integration with xstyle, will probably change
			rule.fullSelector = function(){
				return this.parent.fullSelector() + " .dgrid-cell";
			};
			for(var i = 0;i < rule.children.length;i++){
				var child = rule.children[i];
				child.field = child.className = child.selector.substring(1); 
			}
			return rule.children;
		},
		createRowCells: function(tag, each){
			// summary:
			//		Generates the grid for each row (used by renderHeader and and renderRow)
			var tr, row = put("table");
			var contentBoxSizing;
			var cellNavigation = this.cellNavigation;
			if(has("ie") < 9 || has("quirks")){
				if(has("ie") < 8 && !has("quirks")){
					contentBoxSizing = true;
					row.style.width = "auto"; // in IE7 this is needed instead of 100% to make it not create a horizontal scroll bar
				}
				var tbody = put(row, "tbody");
			}else{
				var tbody = row;
			}
			var subrows = getSubrows(this);
			for(var si = 0, sl = subrows.length; si < sl; si++){
				subrow = subrows[si];
				if(sl == 1 && !has("ie")){
					// shortcut for modern browsers
					tr = tbody;
				}else{
					tr = put(tbody, "tr");
				}
				for(var i in subrow){
					// iterate through the columns
					var column = subrow[i];
					if(typeof column == "string"){
						subrow[i] = column = {name:column};
					}
					if(!column.field && !(subrow instanceof Array)){
						column.field = i;
					}
					var extraClassName = column.className || (column.field && "field-" + column.field);
					var cell = put(tag + ".dgrid-cell.dgrid-cell-padding.column-" + i + (extraClassName ? '.' + extraClassName : ''));
					cell.columnId = i;
					if(cellNavigation && !column.editor || column.editOn){
//						cell.tabIndex = tabIndex;
					}				
					if(contentBoxSizing){
						// The browser (IE7-) does not support box-sizing: border-box, so we emulate it with a padding div
						var innerCell = put(cell, "!dgrid-cell-padding div.dgrid-cell-padding");// remove the dgrid-cell-padding, and create a child with that class
						cell.contents = innerCell;
					}else{
						innerCell = cell;
					}
					var colSpan = column.colSpan;
					if(colSpan){
						cell.colSpan = colSpan;
					}
					var rowSpan = column.rowSpan;
					if(rowSpan){
						cell.rowSpan = rowSpan;
					}
					each(innerCell, column, i);
					// add the td to the tr at the end for better performance
					tr.appendChild(cell);
				}
			}
			return row;
		},
		left: function(cell, steps){
			return this.cell(this._move(cell, -(steps || 1)));
		},
		right: function(cell, steps){
			return this.cell(this._move(cell, steps || 1));
		},
		renderRow: function(object, options){
			var row = this.createRowCells("td[role=gridcell]", function(td, column, id){
				var data = object;
				// we support the field, get, and formatter properties like the DataGrid
				var renderCell = column.renderCell;
				if(column.get){
					data = column.get(data);
				}else if("field" in column){
					data = data[column.field];
				}
				if(column.formatter){
					data = column.formatter(data);
					td.innerHTML = data;
				}
				if(!column.formatter || renderCell){
					if(column.renderCell){
					// A column can provide a renderCell method to do its own DOM manipulation, 
					// event handling, etc.
						data = column.renderCell(object, data, td, options);
					} 
					if(data != null){
						td.appendChild(document.createTextNode(data));
					}
				}
			});

			return row;
		},
		renderHeader: function(headerNode){
			// summary:
			//		Setup the headers for the grid
			var grid = this;
			var columns = this.columns;
			var row = this.createRowCells("th[role=columnheader]", function(th, column, id){
				column.id = id;
				column.grid = grid;
				var field = column.field;
				if(field){
					th.field = field;
				}
				// allow for custom header manipulation
				if(column.renderHeaderCell){
					column.renderHeaderCell(th);
				}else if(column.name || column.field){
					th.appendChild(document.createTextNode(column.name || column.field));
				}
				if(column.sortable !== false){
					th.sortable = true;
				}
			});
			row.className = "dgrid-row";
			headerNode.appendChild(row);
			var lastSortedArrow;
			// if it columns are sortable, resort on clicks
			listen(row, "click", function(event){
				var
					target = event.target,
					field, descending, parentNode;
				do{
					if(target.sortable){
						field = target.field || target.columnId;
						// re-sort
						descending = grid.sortOrder && grid.sortOrder[0].attribute == field && !grid.sortOrder[0].descending;
						if(lastSortedArrow){
							put(lastSortedArrow, "<!dgrid-sort-up!dgrid-sort-down"); // remove the sort classes from parent node
							put(lastSortedArrow, "!"); // destroy the lastSortedArrow node
						}
						lastSortedArrow = put(target.firstChild, "-div.dgrid-arrow-button-node.ui-icon[role=presentation]");
						lastSortedArrow.innerHTML = "&nbsp;";
						put(target, descending ? ".dgrid-sort-down" : ".dgrid-sort-up");
						grid.resize();
						grid.sort(field, descending);
					}
				}while((target = target.parentNode) && target != headerNode);
			});
		},
		styleColumn: function(colId, css){
			// summary:
			//		Changes the column width by creating a dynamic stylesheet
			
			// TODO: Should we first delete the old stylesheet (so it doesn't override the new one)?
			// now create a stylesheet to style the column
			var styleSheet = this.styleSheet; 
			var index = (styleSheet.cssRules || styleSheet.rules).length;
			styleSheet.addRule("#" + this.domNode.id + ' .column-' + colId, css);
			return {
				remove: function(){
					styleSheet.deleteRule(index);
				}
			}
		}
	});
	function getSubrows(grid){
		var columns = grid.columns;
		if(!(columns instanceof Array) || (typeof columns[0].field == "string" || typeof columns[0].renderCell == "function")){
			return [columns];
		}
		return columns;
	}
});
