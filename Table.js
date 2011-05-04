define(["dojo/_base/html", "dojo/_base/declare", "dojo/listen", "./TextEdit", "./List", "cssx/cssx"], function(dojo, declare, listen, TextEdit, List, cssx){
	var create = dojo.create;
	
	return declare([List], {
		layout: [],
		renderRow: function(row, object, options){
			row = dojo.create("table", null, row);
			//row = dojo.create("tr", null, row);
			for(var i = 0, l = this.layout.length; i < l; i++){
				// iterate through the columns
				var column = this.layout[i];
				var td = create("td",{
					className: "dojoxGridxCell",
					colid: i,
					role: "gridcell",
					tabindex: this.tabIndex
				});
				var data = object;
				// we support the field, get, and formatter properties like the DataGrid
				var field = column.field;
				if(field){
					data = data[field];
					td.setAttribute("field", field);
				}
				if(column.get){
					data = column.get(data);
				}
				data = data && data.toString().replace(/</g, '&lt;').replace(/&/g, "&amp;");
				if(column.formatter){
					data = column.formatter(data);
					td.innerHTML = data;
				}else if(!column.renderCell && data != null){
					td.appendChild(document.createTextNode(data));
				}
				// A column can provide a renderCell method to do its own DOM manipulation, 
				// event handling, etc.
				if(column.renderCell){
					column.renderCell(data, td, options);
				}
				// add the td to the tr at the end for better performance
				row.appendChild(td);
			}
			
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the table
			var tr = dojo.create("table", null, this.headerNode);
			var ths = [];
			var table = this;
			for(var i = 0, l = this.layout.length; i < l; i++){
				var column = this.layout[i];
				column.table = this;
				column.field = column.field || column.child && column.child.substring(1);
				if(column.editable){
					column = TextEdit(column);
				}
				var th = 
				create("th",{
					className: "dojoxGridxHeaderCell ui-widget-header",
					role:"columnheader",
					colid: i
				});
				var field = column.field;
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
					// if it is sortable, resort on clicks
					(function(field){
						listen(th, "click", function(){
							// resort
							var descending = table.sortOrder && table.sortOrder[0].attribute == field && !table.sortOrder[0].descending; 
							table.sort(field, descending);
						});
					})(column.field);
				}
			}
		},
		setColumnWidth: function(colId, width){
			// TODO: Change this to a stylesheet insertion
			dojo.query('[colid=' + colId + ']', this.domNode).forEach(function(cell){
				cell.style.width = width + 'px';
			});
			
		}
	});
});