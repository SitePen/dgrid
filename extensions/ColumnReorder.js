define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/query",
	"dojo/dnd/Source",
	"put-selector/put"
], function(lang, declare, arrayUtil, query, DndSource, put){
	var ColumnDndSource = declare(DndSource, {
		onDropInternal: function() {
			var grid = this.grid,
				oldColumns = grid.get("columns"),
				newRow = [];
			
			// First, allow original DnD logic to place node in new location.
			this.inherited(arguments);
			
			// Then, iterate through the header cells in their new order,
			// to populate a new row array to assign as a new sub-row to the grid.
			arrayUtil.forEach(grid.headerNode.firstChild.childNodes, function(col) {
				newRow.push(oldColumns[col.columnId]);
			});
			grid.set("subRows", [newRow]);
		}
	});
	
	var ColumnReorder = declare([], {
		renderHeader: function() {
			this.inherited( arguments );
			
			var dndType = "dgrid-" + this.id + "-column",
				thead = this.headerNode.firstChild;
			
			// enable column reordering for simple single-row structures only
			if(this.subRows.length == 1 && !this.columnSets){
				// TODO: filter out nodes that have an attribute/class that indicates they should not be re-orderable?
				query("th", thead).forEach(function(th){
					put(th, ".dojoDndItem[dndType=" + dndType + "]");
				});
				this.columnDndSource = new ColumnDndSource(thead, {
					horizontal: true,
					accept: [dndType],
					grid: this
				});
			}
		}
	});
	
	ColumnReorder.ColumnDndSource = ColumnDndSource;
	return ColumnReorder;
});
