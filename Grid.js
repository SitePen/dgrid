define(["dojo/has", "put-selector/put", "dojo/_base/declare", "dojo/on", "./Editor", "./List", "dojo/_base/sniff"], function(has, put, declare, listen, Editor, List){
	var contentBoxSizing = has("ie") < 8 && !has("quirks");
	
	function appendIfNode(parent, subNode){
		if(subNode && subNode.nodeType){
			parent.appendChild(subNode);
		}
	}
	
	return declare([List], {
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
			var tr, row = put("table.dgrid-row-table[role=presentation]"),
				cellNavigation = this.cellNavigation;
			if(has("ie") < 9 || has("quirks")){
				// this is the only browser that needs a tbody
				var tbody = put(row, "tbody");
			}else{
				var tbody = row;
			}
			subRows = subRows || this.subRows;
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
			//put(headerNode, "div.dgrid-header-columns>", row, ".dgrid-row<+div.dgrid-header-scroll.ui-widget-header");
			//row = put("div.dgrid-row[role=columnheader]>", row);
			headerNode.appendChild(row);
			// if it columns are sortable, resort on clicks
			listen(row, "click,keydown", function(event){
				// respond to click or space keypress
				if(event.type == "click" || event.keyCode == 32){
					var
						target = event.target,
						field, descending, parentNode;
					do{
						if(target.sortable){
							// stash node subject to DOM manipulations,
							// to be referenced then removed by sort()
							grid._sortNode = target;
							
							field = target.field || target.columnId;
							
							// if the click is on the same column as the active sort,
							// reverse sort direction
							descending = grid.sortOrder && grid.sortOrder[0].attribute == field &&
								!grid.sortOrder[0].descending;
							
							return grid.sort(field, descending);
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
		
		sort: function(property, descending){
			// summary:
			//		Extension of List.js sort to update sort arrow in UI
			
			var prop = property, desc = descending;
			
			// If a full-on sort array was passed, only handle the first criteria
			if(typeof property != "string"){
				prop = property[0].attribute;
				desc = property[0].descending;
			}
			
			// if we were invoked from a header cell click handler, grab
			// stashed target node; otherwise (e.g. direct sort call) need to look up
			var target = this._sortNode, columns, column, i;
			if(!target){
				columns = this.columns;
				for(i in columns){
					column = columns[i];
					if(column.field == prop){
						target = column.headerNode;
					}
				}
			}
			// skip this logic if field being sorted isn't actually displayed
			if(target){
				target = target.contents || target;
				if(this._lastSortedArrow){
					// remove the sort classes from parent node
					put(this._lastSortedArrow, "<!dgrid-sort-up!dgrid-sort-down");
					// destroy the lastSortedArrow node
					put(this._lastSortedArrow, "!");
				}
				// place sort arrow under clicked node, and add up/down sort class
				this._lastSortedArrow = put(target.firstChild, "-div.dgrid-sort-arrow.ui-icon[role=presentation]");
				this._lastSortedArrow.innerHTML = "&nbsp;";
				put(target, desc ? ".dgrid-sort-down" : ".dgrid-sort-up");
				// call resize in case relocation of sort arrow caused any height changes
				this.resize();
				
				delete this._sortNode;
			}
			this.inherited(arguments);
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
				
				// add reference to this instance to each column object,
				// for potential use by column plugins
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
					subRows[i] = this._configColumns(i + '-', subRows[i]);
				}
			}else{
				this.subRows = [this._configColumns("", this.columns)];
			}
		},
		setColumns: function(columns){
			// reset instance variables
			this.subRows = null;
			this.columns = columns;
			// re-run logic
			this._updateColumns();
		},
		setSubRows: function(subrows){
			this.subRows = subrows;
			this._updateColumns();
		},
		_updateColumns: function(){
			// summary:
			//		Called after e.g. columns, subRows, columnSets are updated
			
			this.configStructure();
			this.renderHeader();
			this.refresh();
			// re-render last collection if present
			this.lastCollection && this.renderArray(this.lastCollection);
			this.resize();
		}
	});
});
