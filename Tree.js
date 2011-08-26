define(["dojo/_base/declare", "put-selector/put", "dojo/_base/Deferred", "dojo/query"], function(declare, put, Deferred, querySelector){// TODO: eliminate the dojo/query dep by supporting simple event delegation in the List module

return function(column){
    // summary:
    //      Add a editing capability
    var originalRenderCell = column.renderCell || function(object, value, td){
        if(value != null){
        	put(td, "span.dgrid-expando-text", value);
        }
    };
	column.renderCell = function(object, value, td, options){
		// summary:
		//		Renders a cell that can be expanded, creating more rows
		var level = options.query.level + 1;
		level = isNaN(level) ? 0 : level;
		var grid = this.grid;
		var mayHaveChildren = !grid.store.mayHaveChildren || grid.store.mayHaveChildren(object);
		// create the expando
		var expando = put(td, "div.dgrid-expando-icon" + (mayHaveChildren ? ".ui-icon.ui-icon-triangle-1-e" : "") +
			"[style=margin-left: " + (level * 19) + "px; float: left]");
		expando.innerHTML = "&nbsp;"; // for opera to space things properly
		originalRenderCell.call(this, object, value, td, options);
		expando.level = level;
		expando.mayHaveChildren = mayHaveChildren;
		var tr, query;

		if(!grid._hasTreeListener){
			// just setup the event listener once and use event delegation for better memory use
			grid._hasTreeListener = true;
			this.grid.on(column.expandOn || ".dgrid-expando-icon:click,.dgrid-content .column-" + column.id + ":dblclick", function(event){
				var target = this.className.indexOf("dgrid-expando-icon") > -1 ? this :
					querySelector(".dgrid-expando-icon", this)[0];
				if(target.mayHaveChildren){
					// on click we toggle expanding and collapsing
					var expanded = target.expanded = !target.expanded;
					// update the expando display
					target.className = "dgrid-expando-icon ui-icon ui-icon-triangle-1-" + (expanded ? "se" : "e"); 
					var preloadNode = target.preloadNode;
					var row = grid.row(target);
					var rowElement = row.element;
					if(!preloadNode){
						// if the children have not been created, create a container, a preload node and do the 
						// query for the children
						var container = rowElement.connected = put('div.dgrid-tree-container');//put(rowElement, '+...
						preloadNode = target.preloadNode = put(container, 'div');
						//preloadNode.nextRow = grid.down(row).element;
						var query = function(options){
							return grid.store.getChildren(row.data, options);
						};
						query.level = target.level;
						grid.renderQuery ? 
							grid.renderQuery(query, preloadNode) :
							grid.renderArray(query({}), preloadNode);
					}
					// show or hide all the children
					var styleDisplay = expanded ? "" : "none";
					container = rowElement.connected;
					// TODO: see if want to use a CSS class and a transition (must coordinate with keynav so hidden elements aren't included in nav) 
					if(expanded){
						put(rowElement, '+', container);
					}else{
						container.parentNode.removeChild(container);
					}
/*					put(container, (expanded ? "!" : ".") + "dgrid-tree-container-contracted");
					container.style.display = styleDisplay;// TODO: maybe use a CSS class here*/
				}
			});
		};
	};
	return column;
};
});