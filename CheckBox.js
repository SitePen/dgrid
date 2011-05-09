define(["dojo/listen", "dojo/_base/html"], function(listen, dojo){

return function(column){
	// summary:
	// 		Add a checkbox column
	column.renderCell = function(data, cell){
		var table = column.table;
		if(!table._hasCheckBoxListener){
			table._hasCheckBoxListener = true;
			table.on(".dojoxGridxCheckBox:change", function(event){
				var checked = this.checked;
				var id = table.row(event).id;
				if(column.field){
					dojo.when(table.store.get(id), function(object){ 
						object[column.field] = checked;
						table.store.put(object);
					});
				}
				if(column.selector){
					table.selection.set(id, checked);
				}
			});
		}
		dojo.create("input",{
			type:"checkbox",
			className: "dojoxGridxCheckBox",
			checked: data
		}, cell);
	};
	return column;
};
});


