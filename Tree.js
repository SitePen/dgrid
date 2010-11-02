define([], function(){

return dojo.declare(null, {
	constructor: function(settings){
		// summary:
		//		Creates an expanding tree column to a table
		for(var i in settings){
			this[i] = settings[i];
		} 
	},
	renderCell: function(data, td, options){
		// summary:
		//		Renders a cell that can be expanded, creating more rows
		var level = (options.query.level || 0) + 1;
		td.style.paddingLeft = (level * 19) + "px";
		var expanded, table = this.table;
		// create the expando
		var expando = dojo.create("img", {
			src: table._blankGif,
			className:"dijitTreeExpando dijitTreeExpandoClosed"
		}, td);
		var tr, query;
		var preloadNode;
		expando.onclick = function(){
			// on click we toggle expanding and collapsing
			if(!preloadNode){
				// if the children have not been created, create a preload node and do the 
				// query for the children
				tr = td.parentNode;
				preloadNode = dojo.create("tr", {});
				query.level = level;
				tr.parentNode.insertBefore(preloadNode, tr.nextSibling);
				var object = table.getObject(tr);
				table.renderQuery(query, preloadNode);
			}
			function query(options){
				return table.store.getChildren(object, options);
			}
			// update the expando display
			var styleDisplay = (expanded = !expanded) ? "" : "none";
			if(expanded){
				dojo.removeClass(expando, "dijitTreeExpandoClosed"); 
				dojo.addClass(expando, "dijitTreeExpandoOpened"); 
			}else{
				dojo.removeClass(expando, "dijitTreeExpandoOpened"); 
				dojo.addClass(expando, "dijitTreeExpandoClosed"); 
			}
			// show or hide all the children
			var childTr = tr;
			do{
				childTr = childTr.nextSibling;
				if(childTr){
					childTr.style.display = styleDisplay;
				} 
			}while(childTr && (childTr != preloadNode));
		};
		
		
	}
});
});