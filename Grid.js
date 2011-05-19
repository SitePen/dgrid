define(["dojo/_base/html", "dojo/_base/declare", "dojo/listen", "./Editor", "./List", "cssx/cssx"], function(dojo, declare, listen, Editor, List, cssx){
	var create = dojo.create;
	
	return declare([List], {
		columns: [],
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
						return this.columns[colId];
					}
					target = target.parentNode;
				}while(target && target != this.domNode);
			}
		},
		createRowCells: function(tag, each){
			// summary:
			//		Generates the grid for each row (used by renderHeader and and renderRow)
			var tr, row = create("table", {
			});
			var contentBoxSizing;
			if(dojo.isIE < 8 || dojo.isQuirks){
				if(!dojo.isQuirks){
					contentBoxSizing = true;
					row.style.width = "auto"; // in IE7 this is needed to instead of 100% to make it not create a horizontal scroll bar
				}
				var tbody = create("tbody", null, row);
			}else{
				var tbody = row;
			}
			var subrows = this.columns;
			if(!(subrows[0] instanceof Array)){
				subrows = [subrows];
			}
			for(var si = 0, sl = subrows.length; si < sl; si++){
				subrow = subrows[si];
				if(sl == 1 && !dojo.isIE){
					// shortcut for modern browsers
					tr = tbody;
				}else{
					tr = create("tr", null, tbody);
				}
				for(var i = 0, l = subrow.length; i < l; i++){
					// iterate through the columns
					var column = subrow[i];
					var field = column.field;
					var cell = create(tag,{
						className: "dojoxGridxCell dojoxGridxCellPadding " + (column.className || (field ? "field-" + field : "")) + " column-" + i,
						colid: i
					});
					if(contentBoxSizing){
						// The browser (IE7-) does not support box-sizing: border-box, so we emulate it with a padding div
						var innerCell = create("div", {
							className: "dojoxGridxCellPadding"
						}, cell);
						dojo.removeClass(cell, "dojoxGridxCellPadding");
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
					each(innerCell, column);
					// add the td to the tr at the end for better performance
					tr.appendChild(cell);
				}
			}
			return row;
		},
		renderRow: function(object, options){
			var tabIndex = this.tabIndex;
			var row = this.createRowCells("td", function(td, column){
				td.setAttribute("role", "gridcell");
				if(!column.editor || column.editOn){
					td.setAttribute("tabindex", tabIndex);
				}				
				var data = object, field = column.field;
				// we support the field, get, and formatter properties like the DataGrid
				if(field){
					data = data[field];
				}
				if(column.get){
					data = column.get(data);
				}
				if(column.formatter){
					data = column.formatter(data);
					td.innerHTML = data;
				}else if(!column.renderCell && data != null){
					td.appendChild(document.createTextNode(data));
				}
				// A column can provide a renderCell method to do its own DOM manipulation, 
				// event handling, etc.
				if(column.renderCell){
					column.renderCell(data, td, options, object);
				}
			});
			return row;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the grid
			var grid = this;
			var columns = this.columns;
			if(!columns.checkedTrs){
				columns.checkedTrs = true;
				var trs = this.domNode.getElementsByTagName("tr");
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
							sortable: th.getAttribute("sortable"),
						});
					}
				}
				if(tr){
					this.domNode.removeChild(tr.parentNode);
				}
			}
			var row = this.createRowCells("th", function(th, column){
				th.setAttribute("role", "columnheader");
				column.grid = grid;
				var field = column.field = column.field;
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
			row.className = "dojoxGridxRow ui-widget-header";
			this.headerNode.appendChild(row);
			var lastSortedArrow;
			// if it columns are sortable, resort on clicks
			listen(row, ".dojoxGridxCell:click", function(event){
				if(this.getAttribute("sortable")){
					var field = this.getAttribute("field");
					// resort
					var descending = grid.sortOrder && grid.sortOrder[0].attribute == field && !grid.sortOrder[0].descending;
					if(lastSortedArrow){
						dojo.destroy(lastSortedArrow);
					}
					lastSortedArrow = create("div",{
						role: 'presentation',
						className: 'dojoxGridxArrowButtonNode'
					}, this);
					dojo.removeClass(this, "dojoxGridxSortUp");
					dojo.removeClass(this, "dojoxGridxSortDown");
					dojo.addClass(this, descending ? "dojoxGridxSortDown" : "dojoxGridxSortUp");					
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
});