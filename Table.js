define(["dojo/_base/html", "dojo/_base/declare", "dojo/listen", "./TextEdit", "./List", "cssx/cssx"], function(dojo, declare, listen, TextEdit, List, cssx){
	var create = dojo.create;
	
	return declare([List], {
		layout: [],
		renderRow: function(object, options){
			var row = dojo.create("table", {
			});			
			if(dojo.isIE){
				// TODO: Actually only need to do this in IE7 and below and quirks mode, I think 
				tr = dojo.create("tbody", null, row);
				tr = dojo.create("tr", null, tr);
			}else{
				tr = row;
			}
			for(var i = 0, l = this.layout.length; i < l; i++){
				// iterate through the columns
				var column = this.layout[i];
				var field = column.field;
				var td = create("td",{
					className: "dojoxGridxRowCell dojoxGridxCell" + (field ? " field-" + field : "") + " column-" + i,
					colid: i,
					role: "gridcell",
					tabindex: this.tabIndex
				});
				var data = object;
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
				// add the td to the tr at the end for better performance
				tr.appendChild(td);
			}
			return row;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the table
			this.headerNode.innerHTML = "<table><tr></tr></table>";
			var tr = this.headerNode.getElementsByTagName("tr")[0]; 
			var ths = [];
			var table = this;
			for(var i = 0, l = this.layout.length; i < l; i++){
				var column = this.layout[i];
				column.table = this;
				var field = column.field = column.field || column.child && column.child.substring(1);
				if(column.editable){
					column = TextEdit(column);
				}
				var th = 
				create("th",{
					className: "dojoxGridxHeaderCell dojoxGridxCell ui-widget-header" + (field ? " field-" + field : "") + " column-" + i + (column.sortable ? " dojoxGridxSortable" : ""),
					role:"columnheader",
					colid: i
				});
				if(field){
					th.setAttribute("field", field);
				}
				ths.push(th);
				// allow for custom header manipulation
				if(column.renderHeaderCell){
					column.renderHeaderCell(th);
				}else if(column.name || column.field){
					th.appendChild(document.createTextNode(column.name || column.field));
				}
				tr.appendChild(th);
				if(column.sortable){
					th.setAttribute("sortable", true);
				}
			}
			var lastSortedArrow;
			// if it columns are sortable, resort on clicks
			listen(tr, ".dojoxGridxHeaderCell:click", function(event){
				if(this.getAttribute("sortable")){
					var field = this.getAttribute("field");
					// resort
					var descending = table.sortOrder && table.sortOrder[0].attribute == field && !table.sortOrder[0].descending;
					if(lastSortedArrow){
						dojo.destroy(lastSortedArrow);
					}
					lastSortedArrow = dojo.create("div",{
						role: 'presentation',
						className: 'dojoxGridxArrowButtonNode'
					}, this);
					dojo.removeClass(this, "dojoxGridxSortUp");
					dojo.removeClass(this, "dojoxGridxSortDown");					
					dojo.addClass(this, descending ? "dojoxGridxSortDown" : "dojoxGridxSortUp");					
					table.sort(field, descending);
				}
			});
		},
		_styleSheets: {},
		setColumnWidth: function(colId, width){
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
				 "width: " + width + 'px;' +
			"}");
		}
	});
});