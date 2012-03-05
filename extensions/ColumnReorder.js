define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/query",
	"dojo/dnd/Source",
	"put-selector/put",
	"xstyle/css!../css/extensions/columnReorder.css"
], function(lang, declare, arrayUtil, query, DndSource, put){
	var ColumnDndSource = declare(DndSource, {
		copyState: function(){ return false; }, // never copy
		
		checkAcceptance: function(source, nodes){
			return source == this; // self-accept only
		},
		
		_legalMouseDown: function(evt){
			// summary:
			//		Overridden to prevent blocking ColumnResizer resize handles.
			return evt.target.className.indexOf("dgrid-resize-handle") > -1 ? false :
				this.inherited(arguments);
		},
		
		onDropInternal: function(nodes){
			var grid = this.grid,
				oldColumns = grid.get("columns"),
				newRow = [];
			
			// First, allow original DnD logic to place node in new location.
			this.inherited(arguments);
			
			// Then, iterate through the header cells in their new order,
			// to populate a new row array to assign as a new sub-row to the grid.
			// (Wait until the next turn to avoid errors in Opera.)
			setTimeout(function(){
				arrayUtil.forEach(nodes[0].parentNode.childNodes, function(col) {
					newRow.push(oldColumns[col.columnId]);
				});
				grid.set("subRows", [newRow]);
			}, 0);
		}
	});
	
	var ColumnReorder = declare([], {
		columnDndConstructor: ColumnDndSource,
		renderHeader: function(){
			if(this.columnDndSource){
				// destroy old source before re-rendering header
				this.columnDndSource.destroy();
			}
			
			this.inherited(arguments);
			
			var dndType = this._columnDndType = "dgrid-" + this.id + "-column",
				dndParent;
			
			// enable column reordering for simple single-row structures only
			if(this.subRows.length == 1 && !this.columnSets){
				// TODO: filter out nodes that have an attribute/class that indicates they should not be re-orderable?
				query("th", this.headerNode).forEach(function(th){
					if(!dndParent){ dndParent = th.parentNode; }
					put(th, ".dojoDndItem[dndType=" + dndType + "]");
				});
				this.columnDndSource = new this.columnDndConstructor(dndParent, {
					horizontal: true,
					grid: this
				});
			}
		}
	});
	
	ColumnReorder.ColumnDndSource = ColumnDndSource;
	return ColumnReorder;
});
