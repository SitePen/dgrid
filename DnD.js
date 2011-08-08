define(["dojo/_base/declare", "./List", "dojo/dnd/Source", "xstyle/put", "dojo/on"], function(declare, List, DnDSource, put, on){
	return declare([List], {
		type: "row",
		postCreate: function(){
			this.inherited(arguments);
			var grid = this;
			var store = this.store;
			// make the contents a DnD source/target
			var source = new DnDSource(this.contentNode, {accept:[this.type]});
			on(source, "Drop", function(source, nodes){
				// on drop, move get the objects and move them
				var targetRow = grid.row(source.targetAnchor);
				dojo.when(store.get(targetRow.id), function(target){
					nodes.forEach(function(node){
						var row = grid.row(node);
						dojo.when(store.get(row.id), function(object){
							dojo.when(store.put(object, { before: target}), function(){
								//This might be overkill, but prevents desync of neighboring rows
								//grid.refreshContent();
							});
						});
					});
				});
				//return true;
			});
		},
		renderRow: function(){
			// override to add dojoDndItem class to make the rows draggable
			var row = this.inherited(arguments);
			put(row, '.dojoDndItem');
			return row;
		}
	});
});
