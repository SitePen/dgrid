define(["dojo/on", "dojo/_base/Deferred", "cssx/create"], function(listen, Deferred, create){

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
					Deferred.when(grid.store.get(id), function(object){ 
						object[column.field] = checked;
						grid.store.put(object);
					});
				}
				if(column.selector){
					grid.selection.set(id, checked);
				}
			});
		}
		create(cell, "input[type=checkbox].d-list-checkbox", {
			checked: value
		});
	};
	return column;
};
});


