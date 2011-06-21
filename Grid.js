define(["dojo/_base/html", "cssx/create", "dojo/_base/declare", "dojo/on", "./Editor", "./List", "cssx/cssx"], function(dojo, create, declare, listen, Editor, List, cssx){
	List.prototype.Row.cell = function(id){
		var elements = this.element.getElementsByTagName("td");
		for(var i = 0; i < elements.length; i++){
			if(elements[i].className.indexOf("column-" + id) > -1){
				return elements[i];
			}
		}
	}	
	return declare([List], {
		columns: [],
		// summary:
		//		This indicates that focus is at the cell level. This may be set to false to cause
		//		focus to be at the row level, which is useful if you want only want row-level
		//		navigation.
		cellNavigation: true,
		column: function(target){
			// summary:
			//		Get the column object by node, or event
			if(target.target && target.target.nodeType == 1){
				// event
				target = target.target;
			}
			if(target.nodeType == 1){
				var object;
				do{
					var colId = target.getAttribute("colid");
					if(colId){
						target = colId;
						break;
					}
					target = target.parentNode;
				}while(target && target != this.domNode);
			}
			if(typeof target == "string"){
				var subrows = getSubrows(this);
				for(var si = 0, sl = subrows.length; si < sl; si++){
					var column = subrows[si][target];
					if(column) {
						return column;
					}
				}
			}
		},
		_columnsCss: function(rule){
			// This is an attempt at integration with CSSX, will probably change
			rule.fullSelector = function(){
				return this.parent.fullSelector() + " .d-list-cell";
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
			if(dojo.isIE < 8 || dojo.isQuirks){
				if(!dojo.isQuirks){
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
				if(sl == 1 && !dojo.isIE){
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
					var extraClassName = column.className || (column.field && "field-" + column.field);
					var cell = create(tag + ".d-list-cell.d-list-cell-padding.column-" + i + "[colid=" + i + "]" + (extraClassName ? '.' + extraClassName : ''));
					if(contentBoxSizing){
						// The browser (IE7-) does not support box-sizing: border-box, so we emulate it with a padding div
						var innerCell = create(cell, "div.d-list-cell-padding");
						dojo.removeClass(cell, "d-list-cell-padding");
					}else{
						innerCell = cell;
					}
					var colSpan = column.colSpan;
					if(colSpan){
						cell.setAttribute("colSpan", colSpan);
					}
					var rowSpan = column.rowSpan;
					if(rowSpan){
						cell.setAttribute("rowSpan", rowSpan);
					}
					each(innerCell, column, i);
					// add the td to the tr at the end for better performance
					tr.appendChild(cell);
				}
			}
			return row;
		},
		renderRow: function(object, options){
			var tabIndex = this.tabIndex;
			var cellNavigation = this.cellNavigation;
			var row = this.createRowCells("td[role=gridcell]", function(td, column, id){
				if(cellNavigation && !column.editor || column.editOn){
					td.tabIndex = tabIndex;
				}				
				var data = object;
				// we support the field, get, and formatter properties like the DataGrid
				var renderCell = column.renderCell;
				if(column.get){
					data = column.get(data);
				}else if("field" in column){
					var field = column.field;
					if(field){
						data = data[field];
					}
				}else if(isNaN(id)){
					data = data[id];
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
			if(!cellNavigation){
				row.tabIndex = tabIndex;
			}
			return row;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the grid
			var grid = this;
			var columns = this.columns;
			if(!this.checkedTrs){
				this.checkedTrs = true;
				createColumnsFromDom(this.domNode, columns);
			}
			var row = this.createRowCells("th[role=columnheader]", function(th, column, id){
				column.id = id;
				column.grid = grid;
				var field = column.field;
				if(column.editable){
					column = Editor(column, "text", "focus");
				}
				if(field){
					th.setAttribute("field", field);
				}
				// allow for custom header manipulation
				if(column.renderHeaderCell){
					column.renderHeaderCell(th);
				}else if(column.name || column.field){
					th.appendChild(document.createTextNode(column.name || column.field));
				}
				if(column.sortable){
					th.setAttribute("sortable", true);
				}
			});
			row.className = "d-list-row ui-widget-header";
			this.headerNode.appendChild(row);
			var lastSortedArrow;
			// if it columns are sortable, resort on clicks
			listen(row, ".d-list-cell:click", function(event){
				if(this.getAttribute("sortable")){
					var field = this.getAttribute("field");
					// re-sort
					var descending = grid.sortOrder && grid.sortOrder[0].attribute == field && !grid.sortOrder[0].descending;
					if(lastSortedArrow){
						dojo.destroy(lastSortedArrow);
					}
					lastSortedArrow = create(this, "div.d-list-arrow-button-node[role=presentation]");
					//this.className = this.className.replace(/d-list-sort-\w+/,'');
					dojo.removeClass(this, "d-list-sort-up");
					dojo.removeClass(this, "d-list-sort-down");
					this.className += descending ? "d-list-sort-down" : "d-list-sort-up";
					dojo.addClass(this, descending ? "d-list-sort-down" : "d-list-sort-up");					
					grid.sort(field, descending);
				}
			});
		},
		_styleSheets: {},
		styleColumn: function(colId, css){
			// summary:
			//		Changes the column width by creating a dynamic stylesheet
			
			// first delete the old stylesheet (so it doesn't override the new one)
			var previousStyleSheet = this._styleSheets[colId];
			if(previousStyleSheet){
				dojo.destroy(previousStyleSheet);
			}
			// now create a stylesheet to style the column
			this._styleSheets[colId] = cssx.createStyleNode(
			"#" + this.domNode.id + ' th.column-' + colId + ', #' + this.domNode.id + ' td.column-' + colId + '{' +
				 css +
			"}");
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