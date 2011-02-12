(function(){
function has(){
	return document.createElement("div").ontouchstart === null;
}
define(["compose", "uber/listen", "./TextEdit", "./List"], function(Compose, listen, TextEdit, List){
	// allow for custom CSS class definitions 
	var create = function(tag, props, target){
		var node = document.createElement(tag);
		Compose.call(node, props);
		if(props.style){
			Compose.call(node.style, props.style);
		}
		if(target){
			target.appendChild(node);
		}
		return node;
	};
	
	return Compose(List, {
		renderRowContents: function(tr, object, options){
			for(var i = 0, l = this.structure.length; i < l; i++){
				// iterate through the columns
				var column = this.structure[i];
				var td = create("div",{
					className: "list-cell",
					style: {
						width: column.width || "200px",
						overflow: "hidden",
						margin: "2px",
						padding: "1px" // temporarily to match the css on the headers
					}
				});
				var data = object;
				// we support the field, get, and formatter properties like the DataGrid
				if(column.field){
					data = data[column.field];
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
				tr.appendChild(td);
			}
			
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the table
			var tr = this.headerNode;
			var ths = [];
			var table = this;
			for(var i = 0, l = this.structure.length; i < l; i++){
				var column = this.structure[i];
				column.table = this;
				if(column.editable){
					column = TextEdit(column);
				}
				var th = 
				create("div",{
					className: "ui-widget-header",
					style: {
						width: column.width || "200px",
						"float": "left",
						overflow: "hidden"
					}
				});
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
			create("div",{
					width: "20px"
				}, tr);
			create("div",{
					style: {
						visibility: "hidden",
						clear: "both"
					}
				}, tr);
			return 404;
		}
	});
});
})();