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
		var expando = create(td, ".d-list-expando-icon" + (!grid.store.mayHaveChildren || 
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
			this.grid.on("click", function(event){
				var target = event.target;
				while(target.className.indexOf("d-list-expando-icon") < 0){
					if("className" in (target = target.parentNode)){
						return;
					}
				}
				// on click we toggle expanding and collapsing
				var expanded = target.expanded = !target.expanded;
				// update the expando display
				target.className = "d-list-expando-icon ui-icon ui-icon-triangle-1-" + (expanded ? "se" : "e"); 
				var preloadNode = target.preloadNode;
				var row = grid.row(target);
				var rowElement = row.element;
				if(!preloadNode){
					// if the children have not been created, create a preload node and do the 
					// query for the children
					preloadNode = target.preloadNode = create('div');
					var query = function(options){
						return grid.store.getChildren(row.data, options);
					};
					query.level = target.level;
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