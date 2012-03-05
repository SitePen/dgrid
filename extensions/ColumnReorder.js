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
			var grid = this.grid;
			this.inherited(arguments);
			
			var oldColumns = grid.get("columns");
			var newColumns = {};
			
			// TODO: populate subRows instead
			arrayUtil.forEach(grid.headerNode.firstChild.childNodes, function(currentColumn) {
				newColumns[currentColumn.columnId] = oldColumns[currentColumn.columnId];
			});
			
			grid.set("columns", newColumns);
		}
	});
	
	var ColumnReorder = declare([], {
		renderHeader: function() {
			this.inherited( arguments );
			
			var dndType = "dgrid-" + this.id + "-column",
				thead = this.headerNode.firstChild;
			
			if(this.subRows.length == 1 && !this.columnSets){
				// TODO: filter out nodes that have an attribute/class that indicates they should not be re-orderable?
				query("th", thead).forEach(function(th){
					put(th, ".dojoDndItem[dndType=" + dndType + "]");
				});
				//.addClass("dojoDndItem").attr("dndType", "dgrid-" + this.id + "-column");
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
