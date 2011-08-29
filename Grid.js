define(["dojo/has", "put-selector/put", "dojo/_base/declare", "dojo/on", "./Editor", "./List", "dojo/_base/sniff"], function(has, put, declare, listen, Editor, List){
	var contentBoxSizing = has("ie") < 8 && !has("quirks");

	return declare([List], {
		columns: null,
		// summary:
		//		This indicates that focus is at the cell level. This may be set to false to cause
		//		focus to be at the row level, which is useful if you want only want row-level
		//		navigation.
		cellNavigation: true,
		tabableHeader: true,
		column: function(target){
			// summary:
			//		Get the column object by node, or event, or a columnId
			if(typeof target == "string"){
				return this.columns[target];
			}else{
				return this.cell(target).column;
			}
		},
		listType: "grid",
		cell: function(target, columnId){
			// summary:
			//		Get the cell object by node, or event, id, plus a columnId
			if(target.target && target.target.nodeType){
				// event
				target = target.target;
			}
			var element;
			if(target.nodeType){
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
			var tr, row = put("table.dgrid-row-table[role=presentation]"),
				cellNavigation = this.cellNavigation;
			if(has("ie") < 9 || has("quirks")){
				// this is the only browser that needs a tbody
				var tbody = put(row, "tbody");
			}else{
				var tbody = row;
			}
			var subRows = this.subRows;
			for(var si = 0, sl = subRows.length; si < sl; si++){
				var subRow = subRows[si];
				if(sl == 1 && !has("ie")){
					// shortcut for modern browsers
					tr = tbody;
				}else{
					tr = put(tbody, "tr");
				}				
				for(var i = 0, l = subRow.length; i < l; i++){
					// iterate through the columns
					var column = subRow[i];
					var id = column.id;
					var extraClassName = column.className || (column.field && "field-" + column.field);
					var cell = put(tag + ".dgrid-cell.dgrid-cell-padding.column-" + id + (extraClassName ? '.' + extraClassName : ''));
					cell.columnId = id;
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
					each(innerCell, column);
					// add the td to the tr at the end for better performance
					tr.appendChild(cell);
				}
			}
			return row;
		},
		left: function(cell, steps){
			return this.cell(this._move(cell, -(steps || 1), "dgrid-cell"));
		},
		right: function(cell, steps){
			return this.cell(this._move(cell, steps || 1, "dgrid-cell"));
		},
		renderRow: function(object, options){
			var row = this.createRowCells("td", function(td, column){
				var data = object;
				// we support the field, get, and formatter properties like the DataGrid
				if(column.get){
					// FIXME: signature of get is (inRowIndex, inItem)
					// Is it possible for us to produce row index here for first arg?
					data = column.get(0, object);
				}else if("field" in column && column.field != "_item"){
					data = data[column.field];
				}
				if(column.formatter){
					td.innerHTML = column.formatter(data);
				}else if(column.renderCell){
					// A column can provide a renderCell method to do its own DOM manipulation, 
					// event handling, etc.
					var subNode = column.renderCell(object, data, td, options);
					if(subNode && subNode.nodeType){
						td.appendChild(subNode);
					}
				}else if(data != null){
					td.appendChild(document.createTextNode(data));
				}
			});
			// row gets a wrapper div for a couple reasons:
			//	1. So that one can set a fixed height on rows (heights can't be set on <table>'s AFAICT)
			// 2. So that outline style can be set on a row when it is focused, and Safari's outline style is broken on <table>
			return put("div[role=gridcell]>", row);
		},
		renderHeader: function(headerNode){
			// summary:
			//		Setup the headers for the grid
			var grid = this;
			var columns = this.columns;
			var row = this.createRowCells("th[role=columnheader]", function(th, column){
				var contentNode = th;
				if(contentBoxSizing){
					// we're interested in the th, but we're passed the inner div
					th = th.parentNode;
				}
				column.grid = grid;
				var field = column.field;
				if(field){
					th.field = field;
				}
				// allow for custom header content manipulation
				if(column.renderHeaderCell){
					column.renderHeaderCell(contentNode);
				}else if(column.label || column.field){
					contentNode.appendChild(document.createTextNode(column.label || column.field));
				}
				if(column.sortable !== false){
					th.sortable = true;
					th.className += " dgrid-sortable";
				}
			});
			this._rowIdToObject[row.id = this.id + "-header"] = this.columns;
			//put(headerNode, "div.dgrid-header-columns>", row, ".dgrid-row<+div.dgrid-header-scroll.ui-widget-header");
			//row = put("div.dgrid-row[role=columnheader]>", row);
			headerNode.appendChild(row);
			var lastSortedArrow;
			// if it columns are sortable, resort on clicks
			listen(row, "click,keydown", function(event){
				if(event.type == "click" || event.keyCode == 32){
					var
						target = event.target,
						field, descending, parentNode;
					do{
						if(target.sortable){
							field = target.field || target.columnId;
							target = target.contents || target;
							// re-sort
							descending = grid.sortOrder && grid.sortOrder[0].attribute == field && !grid.sortOrder[0].descending;
							if(lastSortedArrow){
								put(lastSortedArrow, "<!dgrid-sort-up!dgrid-sort-down"); // remove the sort classes from parent node
								put(lastSortedArrow, "!"); // destroy the lastSortedArrow node
							}
							lastSortedArrow = put(target.firstChild, "-div.dgrid-sort-arrow.ui-icon[role=presentation]");
							lastSortedArrow.innerHTML = "&nbsp;";
							put(target, descending ? ".dgrid-sort-down" : ".dgrid-sort-up");
							grid.resize();
							return grid.sort(field, descending);
						}
					}while((target = target.parentNode) && target != headerNode);
				}
			});
		},
		styleColumn: function(colId, css){
			// summary:
			//		Changes the column width by creating a dynamic stylesheet
			
			// now add a rule to style the column
			return this.addCssRule("#" + this.domNode.id + ' .column-' + colId, css);
		},
		_configColumns: function(prefix, rowColumns){
			// configure the current column
			var subRow = [];
			var isArray = rowColumns instanceof Array; 
			for(var columnId in rowColumns){
				var column = rowColumns[columnId];
				if(typeof column == "string"){
					rowColumns[columnId] = column = {label:column};
				}
				if(!isArray && !column.field){
					column.field = columnId;
				}
				columnId = column.id = column.id || (isNaN(columnId) ? columnId : (prefix + columnId));
				if(prefix){
					this.columns[columnId] = column;
				} 
				subRow.push(column); // make sure it can be iterated on
			}
			return isArray ? rowColumns : subRow;
		},
		configStructure: function(){
			// configure the columns and subRows
			var subRows = this.subRows;
			if(subRows){
				// we have subRows, but no columns yet, need to create the columns
				this.columns = {};
				for(var i = 0; i < subRows.length; i++){
					subRows[i] = this._configColumns(i + '-', subRows[i]);
				}
			}else{
				this.subRows = [this._configColumns("", this.columns)];
			}
		}
	});
});
