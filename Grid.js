define(["dojo/_base/kernel", "dojo/_base/declare", "dojo/on", "dojo/has", "put-selector/put", "./List", "dojo/_base/sniff"],
function(kernel, declare, listen, has, put, List){
	var contentBoxSizing = has("ie") < 8 && !has("quirks");
	var invalidClassChars = /[^\._a-zA-Z0-9-]/g;	
	function appendIfNode(parent, subNode){
		if(subNode && subNode.nodeType){
			parent.appendChild(subNode);
		}
	}
	
	var Grid = declare([List], {
		columns: null,
		// cellNavigation: Boolean
		//		This indicates that focus is at the cell level. This may be set to false to cause
		//		focus to be at the row level, which is useful if you want only want row-level
		//		navigation.
		cellNavigation: true,
		tabableHeader: true,
		showHeader: true,
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
			
			if(target.row && target.row instanceof this._Row){ return target; }
			
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
		createRowCells: function(tag, each, subRows){
			// summary:
			//		Generates the grid for each row (used by renderHeader and and renderRow)
			var row = put("table.dgrid-row-table[role=presentation]"),
				cellNavigation = this.cellNavigation,
				// IE < 9 needs an explicit tbody; other browsers do not
				tbody = (has("ie") < 9 || has("quirks")) ? put(row, "tbody") : row,
				tr,
				si, sl, i, l, // iterators
				subRow, column, id, extraClassName, cell, innerCell, colSpan, rowSpan; // used inside loops
			
			// Allow specification of custom/specific subRows, falling back to
			// those defined on the instance.
			subRows = subRows || this.subRows;
			
			for(si = 0, sl = subRows.length; si < sl; si++){
				subRow = subRows[si];
				// for single-subrow cases in modern browsers, TR can be skipped
				// http://jsperf.com/table-without-trs
				tr = (sl == 1 && !has("ie")) ? tbody : put(tbody, "tr");
				
				for(i = 0, l = subRow.length; i < l; i++){
					// iterate through the columns
					column = subRow[i];
					id = column.id;
					extraClassName = column.className || (column.field && "field-" + column.field);
					cell = put(tag + (".dgrid-cell.dgrid-cell-padding.dgrid-column-" + id +
						(extraClassName ? "." + extraClassName : "")).replace(invalidClassChars,"-"));
					cell.columnId = id;
					if(contentBoxSizing){
						// The browser (IE7-) does not support box-sizing: border-box, so we emulate it with a padding div
						innerCell = put(cell, "!dgrid-cell-padding div.dgrid-cell-padding");// remove the dgrid-cell-padding, and create a child with that class
						cell.contents = innerCell;
					}else{
						innerCell = cell;
					}
					colSpan = column.colSpan;
					if(colSpan){
						cell.colSpan = colSpan;
					}
					rowSpan = column.rowSpan;
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
					data = column.get(object);
				}else if("field" in column && column.field != "_item"){
					data = data[column.field];
				}
				if(column.formatter){
					td.innerHTML = column.formatter(data);
				}else if(column.renderCell){
					// A column can provide a renderCell method to do its own DOM manipulation, 
					// event handling, etc.
					appendIfNode(td, column.renderCell(object, data, td, options));
				}else if(data != null){
					td.appendChild(document.createTextNode(data));
				}
			}, options && options.subRows);
			// row gets a wrapper div for a couple reasons:
			//	1. So that one can set a fixed height on rows (heights can't be set on <table>'s AFAICT)
			// 2. So that outline style can be set on a row when it is focused, and Safari's outline style is broken on <table>
			return put("div[role=gridcell]>", row);
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the grid
			var
				grid = this,
				columns = this.columns,
				headerNode = this.headerNode,
				i = headerNode.childNodes.length;
			
			// clear out existing header in case we're resetting
			while(i--){
				put(headerNode.childNodes[i], "!");
			}
			
			var row = this.createRowCells("th[role=columnheader]", function(th, column){
				var contentNode = column.headerNode = th;
				if(contentBoxSizing){
					// we're interested in the th, but we're passed the inner div
					th = th.parentNode;
				}
				var field = column.field;
				if(field){
					th.field = field;
				}
				// allow for custom header content manipulation
				if(column.renderHeaderCell){
					appendIfNode(contentNode, column.renderHeaderCell(contentNode));
				}else if(column.label || column.field){
					contentNode.appendChild(document.createTextNode(column.label || column.field));
				}
				if(column.sortable !== false){
					th.sortable = true;
					th.className += " dgrid-sortable";
				}
			});
			this._rowIdToObject[row.id = this.id + "-header"] = this.columns;
			headerNode.appendChild(row);
			// if it columns are sortable, resort on clicks
			listen(row, "click,keydown", function(event){
				// respond to click or space keypress
				if(event.type == "click" || event.keyCode == 32){
					var
						target = event.target,
						field, descending, parentNode, sort;
					do{
						if(target.sortable){
							// stash node subject to DOM manipulations,
							// to be referenced then removed by sort()
							grid._sortNode = target;
							
							field = target.field || target.columnId;
							
							// if the click is on the same column as the active sort,
							// reverse sort direction
							descending = (sort = grid._sort[0]) && sort.attribute == field &&
								!sort.descending;
							
							return grid.set("sort", field, descending);
						}
					}while((target = target.parentNode) && target != headerNode);
				}
			});
		},
		
		resize: function(){
			// extension of List.resize to allow accounting for
			// column sizes larger than actual grid area
			var
				headerTableNode = this.headerNode.firstChild,
				contentNode = this.contentNode,
				width;
			
			this.inherited(arguments);
			
			if(!has("ie") || (has("ie") > 7 && !has("quirks"))){
				// Force contentNode width to match up with header width.
				// (Old IEs don't have a problem due to how they layout.)
				
				contentNode.style.width = ""; // reset first
				
				if(contentNode && headerTableNode){
					if((width = headerTableNode.offsetWidth) != contentNode.offsetWidth){
						// update size of content node if necessary (to match size of rows)
						// (if headerTableNode can't be found, there isn't much we can do)
						contentNode.style.width = width + "px";
					}
				}
			}
		},
		
		_setSort: function(property, descending){
			// summary:
			//		Extension of List.js sort to update sort arrow in UI
			
			this.inherited(arguments); // normalize _sort first
			
			// clean up UI from any previous sort
			if(this._lastSortedArrow){
				// remove the sort classes from parent node
				put(this._lastSortedArrow, "<!dgrid-sort-up!dgrid-sort-down");
				// destroy the lastSortedArrow node
				put(this._lastSortedArrow, "!");
				delete this._lastSortedArrow;
			}
			
			if(!this._sort[0]){ return; } // nothing to do if no sort is specified
			
			var prop = this._sort[0].attribute,
				desc = this._sort[0].descending,
				target = this._sortNode, // stashed if invoked from header click
				columns, column, i;
			
			delete this._sortNode;
			
			if(!target){
				columns = this.columns;
				for(i in columns){
					column = columns[i];
					if(column.field == prop){
						target = column.headerNode;
						break;
					}
				}
			}
			// skip this logic if field being sorted isn't actually displayed
			if(target){
				target = target.contents || target;
				// place sort arrow under clicked node, and add up/down sort class
				this._lastSortedArrow = put(target.firstChild, "-div.dgrid-sort-arrow.ui-icon[role=presentation]");
				this._lastSortedArrow.innerHTML = "&nbsp;";
				put(target, desc ? ".dgrid-sort-down" : ".dgrid-sort-up");
				// call resize in case relocation of sort arrow caused any height changes
				this.resize();
			}
		},
		styleColumn: function(colId, css){
			// summary:
			//		Dynamically creates a stylesheet rule to alter a column's style.
			
			// now add a rule to style the column
			return this.addCssRule("#" + this.domNode.id + " .dgrid-column-" + colId, css);
		},
		
		/*=====
		_configColumn: function(column, columnId, rowColumns, prefix){
			// summary:
			//		Method called when normalizing base configuration of a single
			//		column.  Can be used as an extension point for behavior requiring
			//		access to columns when a new configuration is applied.
		},=====*/
		
		_configColumns: function(prefix, rowColumns){
			// configure the current column
			var subRow = [],
				isArray = rowColumns instanceof Array,
				columnId, column;
			for(columnId in rowColumns){
				column = rowColumns[columnId];
				if(typeof column == "string"){
					rowColumns[columnId] = column = {label:column};
				}
				if(!isArray && !column.field){
					column.field = columnId;
				}
				columnId = column.id = column.id || (isNaN(columnId) ? columnId : (prefix + columnId));
				if(prefix){ this.columns[columnId] = column; }
				
				// allow further base configuration in subclasses
				if(this._configColumn){
					this._configColumn(column, columnId, rowColumns, prefix);
				}
				
				// add grid reference to each column object for potential use by plugins
				column.grid = this;
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
					subRows[i] = this._configColumns(i + "-", subRows[i]);
				}
			}else{
				this.subRows = [this._configColumns("", this.columns)];
			}
		},
		_setColumns: function(columns){
			// reset instance variables
			this.subRows = null;
			this.columns = columns;
			// re-run logic
			this._updateColumns();
		},
		_setSubRows: function(subrows){
			this.subRows = subrows;
			this._updateColumns();
		},
		setColumns: function(columns){
			kernel.deprecated("setColumns(...)", 'use set("columns", ...) instead', "dgrid 1.0");
			this.set("columns", columns);
		},
		setSubRows: function(subrows){
			kernel.deprecated("setSubRows(...)", 'use set("subRows", ...) instead', "dgrid 1.0");
			this.set("subRows", subrows);
		},
		
		_updateColumns: function(){
			// summary:
			//		Called after e.g. columns, subRows, columnSets are updated
			
			this.configStructure();
			this.renderHeader();
			this.refresh();
			// re-render last collection if present
			this._lastCollection && this.renderArray(this._lastCollection);
			this.resize();
		}
	});
	
	// expose appendIfNode and default implementation of renderCell,
	// e.g. for use by column plugins
	Grid.appendIfNode = appendIfNode;
	Grid.defaultRenderCell = function(object, data, td, options){
		if(data != null){ td.appendChild(document.createTextNode(data)); }
	};
	return Grid;
});
