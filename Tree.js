define(["dojo/_base/declare", "xstyle/create"], function(declare, create){

return declare([], {
	constructor: function(mixin){
		for(var i in mixin){
			this[i] = mixin[i];
		}
	},
	renderCell: function(object, value, td, options){
		// summary:
		//		Renders a cell that can be expanded, creating more rows
		var level = options.query.level + 1;
		level = isNaN(level) ? 0 : level;
		var grid = this.grid;
		// create the expando
		var expando = create(td, ".d-list-expando" + (!grid.store.mayHaveChildren || 
			grid.store.mayHaveChildren(object) ? ".ui-icon.ui-icon-triangle-1-e" : "") +
			"[style=margin-left: " + (level * 19) + "px; float: left]");
		if(this.field){
			create(td, "span.d-list-expando-text", value);
		}			
		expando.level = level;
		var tr, query;

		if(!grid._hasTreeListener){
			// just setup the event listener once and use event delegation for better memory use
			grid._hasTreeListener = true;
			this.grid.on(".d-list-expando:click", function(event){
				// on click we toggle expanding and collapsing
				var expanded = this.expanded = !this.expanded;
				// update the expando display
				this.className = "d-list-expando ui-icon ui-icon-triangle-1-" + (expanded ? "se" : "e"); 
				var preloadNode = this.preloadNode;
				var row = grid.row(this);
				var rowElement = row.element;
				if(!preloadNode){
					// if the children have not been created, create a preload node and do the 
					// query for the children
					preloadNode = this.preloadNode = create('div');
					var query = function(options){
						return grid.store.getChildren(row.data, options);
					};
					query.level = this.level;
					rowElement.parentNode.insertBefore(preloadNode, rowElement.nextSibling);
					grid.renderQuery(query, preloadNode);
				}
				// show or hide all the children
				var styleDisplay = expanded ? "" : "none";
				do{
					rowElement = rowElement.nextSibling;
					if(rowElement){
						rowElement.style.display = styleDisplay;
					} 
				}while(rowElement && (rowElement != preloadNode));
			});
		};
	}
});
});