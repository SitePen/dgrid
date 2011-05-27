define(["dojo/on", "dojo/_base/html"], function(listen, dojo){

return function(column){
	// summary:
	// 		Add a checkbox column
	column.renderCell = function(object, value, cell){
		var grid = column.grid;
		if(!grid._hasCheckBoxListener){
			grid._hasCheckBoxListener = true;
			grid.on(".d-list-checkbox:change", function(event){
				var checked = this.checked;
				var id = grid.row(event).id;
				if(column.field){
					dojo.when(grid.store.get(id), function(object){ 
						object[column.field] = checked;
						grid.store.put(object);
					});
				}
				if(column.selector){
					grid.selection.set(id, checked);
				}
			});
		}
		dojo.create("input",{
			type:"checkbox",
			className: "d-list-checkbox",
			checked: value
		}, cell);
	};
	return column;
};
});


