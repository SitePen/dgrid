define(["dojo/has", "xstyle/create", "dojo/_base/declare", "dojo/on", "./Editor", "./List", "dojo/_base/sniff"], function(has, create, declare, listen, Editor, List){
	var scrollbarWidth;
	return declare([List], {
		columns: [],
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
				var row = this.row(target); 
				var elements = row.element.getElementsByTagName("td");
				for(var i = 0; i < elements.length; i++){
					if(elements[i].columnId == columnId){
						element = elements[i];
						break;
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
			var tr, row = create("table");
			var contentBoxSizing;
			var cellNavigation = this.cellNavigation;
			var tabIndex = this.tabIndex;
			if(has("ie") < 8 || has("quirks")){
				if(!has("quirks")){
					contentBoxSizing = true;
					row.style.width = "auto"; // in IE7 this is needed to instead of 100% to make it not create a horizontal scroll bar
				}
				var tbody = create(row, "tbody");
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
					tr = create(tbody, "tr");
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
					var cell = create(tag + ".dgrid-cell.dgrid-cell-padding.column-" + i + (extraClassName ? '.' + extraClassName : ''));
					cell.columnId = i;
					if(cellNavigation && !column.editor || column.editOn){
						cell.tabIndex = tabIndex;
					}				
					if(contentBoxSizing){
						// The browser (IE7-) does not support box-sizing: border-box, so we emulate it with a padding div
						var innerCell = create(cell, "div.dgrid-cell-padding");
						cell.className = cell.className.replace(/ dgrid-cell-padding/, '');
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
			if(!cellNavigation){
				row.tabIndex = tabIndex;
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
			if(!this.checkedTrs){
				this.checkedTrs = true;
				createColumnsFromDom(this.domNode, columns);
			}
			if(!scrollbarWidth){ // we haven't computed the scroll bar width yet, do so now, and add a new rule if need be
				scrollbarWidth = grid.bodyNode.offsetWidth - grid.bodyNode.clientWidth;
				if(scrollbarWidth != 17){
					this.css.addRule(".dgrid-header", "right: " + scrollbarWidth + "px");
				}
			}
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
				var target = event.target;
				do{
					if(target.sortable){
						var field = target.field || target.columnId;
						// re-sort
						var descending = grid.sortOrder && grid.sortOrder[0].attribute == field && !grid.sortOrder[0].descending;
						if(lastSortedArrow){
							lastSortedArrow.parentNode.removeChild(lastSortedArrow);
						}
						lastSortedArrow = create(target.firstChild, "-div.dgrid-arrow-button-node.ui-icon[role=presentation]");
						target.className = target.className.replace(/dgrid-sort-\w+/,'');
						target.className += descending ? " dgrid-sort-down" : " dgrid-sort-up";
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
			this.css.addRule("#" + this.domNode.id + ' th.column-' + colId + ', #' + this.domNode.id + ' td.column-' + colId, css);
		}
	});
	function getSubrows(grid){
		var columns = grid.columns;
		if(!(columns instanceof Array) || (typeof columns[0].field == "string" || typeof columns[0].renderCell == "function")){
			return [columns];
		}
		return columns;
	}
	function createColumnsFromDom(domNode, columns){
		// summary:
		//		generate columns from DOM. Should this be in here, or a separate module?
		var trs = domNode.getElementsByTagName("tr");
		for(var i = 0; i < trs.length; i++){
			var rowColumns = [];
			columns.push(rowColumns);
			var tr = trs[i];
			var ths = tr.getElementsByTagName("th");
			for(var j = 0; j < ths.length; j++){
				var th = ths[j];
				rowColumns.push({
					name: th.innerHTML,
					field: th.getAttribute("field") || th.className || th.innerHTML,
					className: th.className,
					editable: th.getAttribute("editable"),
					sortable: th.getAttribute("sortable")
				});
			}
		}
		if(tr){
			domNode.removeChild(tr.parentNode);
		}
		
	}
});