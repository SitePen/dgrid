define(["dojo/_base/declare", "put-selector/put", "dojo/_base/Deferred", "dojo/query", "dojo/aspect"], function(declare, put, Deferred, querySelector, aspect){

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
		var level = Number(options.query.level) + 1;
		level = isNaN(level) ? 0 : level;
		var grid = this.grid;
		var mayHaveChildren = !grid.store.mayHaveChildren || grid.store.mayHaveChildren(object);
		// create the expando
		var dir = grid.isRTL ? "right" : "left";
		var expando = put(td, "div.dgrid-expando-icon" + (mayHaveChildren ? ".ui-icon.ui-icon-triangle-1-e" : "") +
			"[style=margin-" + dir + ": " + (level * 19) + "px; float: " + dir + "]");
		expando.innerHTML = "&nbsp;"; // for opera to space things properly
		originalRenderCell.call(this, object, value, td, options);
		expando.level = level;
		expando.mayHaveChildren = mayHaveChildren;
		var tr, query;

		if(!grid.expand){
			// just setup the event listener once and use event delegation for better memory use
			grid.on(column.expandOn || ".dgrid-expando-icon:click,.dgrid-content .column-" + column.id + ":dblclick", function(){
				grid.expand(this);
			});
			aspect.before(grid, "removeRow", function(rowElement, justCleanup){
				var connected = rowElement.connected;
				if(connected){
					// if it has a connected expando node, we process the children
					querySelector(">.dgrid-row", connected).forEach(function(element){
						grid.removeRow(element);
					});
					// now remove the connected container node
					if(!justCleanup){
						put(connected, "!");
					}
				}
			});
			grid.getRowHeight = function(rowElement){
				// we override this method so we can provide row height measurements that
				// include the children of a row
				var connected = rowElement.connected;
				// if connected, need to consider this in the total row height
				return rowElement.offsetHeight + (connected ? connected.offsetHeight : 0); 
			};
			
			grid.expand = function(target, expand){
				target = target.element || target; // if a row object was passed in, get the element first 
				target = target.className.indexOf("dgrid-expando-icon") > -1 ? target :
					querySelector(".dgrid-expando-icon", target)[0];
				if(target.mayHaveChildren){
					// on click we toggle expanding and collapsing
					var expanded = target.expanded = expand === undefined ? !target.expanded : expand;
					// update the expando display
					target.className = "dgrid-expando-icon ui-icon ui-icon-triangle-1-" + (expanded ? "se" : "e"); 
					var preloadNode = target.preloadNode,
						row = grid.row(target),
						rowElement = row.element,
						container;
					if(!preloadNode){
						// if the children have not been created, create a container, a preload node and do the 
						// query for the children
						container = rowElement.connected = put('div.dgrid-tree-container');//put(rowElement, '+...
						preloadNode = target.preloadNode = put(container, 'div.dgrid-preload');
						var query = function(options){
							return grid.store.getChildren(row.data, options);
						};
						query.level = target.level;
						grid.renderQuery ?
							grid._trackError(function(){
								return grid.renderQuery(query, preloadNode);
							}) :
							grid.renderArray(query({}), preloadNode);
					}
					// show or hide all the children
					var styleDisplay = expanded ? "" : "none";
					container = rowElement.connected;
					// TODO: see if want to use a CSS class and a transition (must coordinate with keynav so hidden elements aren't included in nav) 
					if(expanded){
						put(rowElement, '+', container);
					}else if(container.parentNode){
						container.parentNode.removeChild(container);
					}
				}
			};
		}
	};
	return column;
};
});