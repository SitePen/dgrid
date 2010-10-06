dojo.provide("dojox.table.Tree");

dojo.declare("dojox.table.Tree", null, {
	constructor: function(settings){
		for(var i in settings){
			this[i] = settings[i];
		} 
	},
	renderCell: function(data, td, options){
		var level = (options.query.level || 0) + 1;
		td.style.paddingLeft = (level * 19) + "px";
		var expanded, grid = this.grid;
		var expando = dojo.create("img", {
			src: grid._blankGif,
			className:"dijitTreeExpando dijitTreeExpandoClosed"
		}, td);
		var tr, query;
		var preloadNode;
		expando.onclick = function(){
			if(!preloadNode){
				tr = td.parentNode;
				preloadNode = dojo.create("tr", {});
				query.level = level;
				tr.parentNode.insertBefore(preloadNode, tr.nextSibling);
				var object = grid.getObject(tr);
				grid.renderQuery(query, preloadNode);
			}
			function query(options){
				return grid.store.getChildren(object, options);
			}
			var styleDisplay = (expanded = !expanded) ? "" : "none";
			if(expanded){
				dojo.removeClass(expando, "dijitTreeExpandoClosed"); 
				dojo.addClass(expando, "dijitTreeExpandoOpened"); 
			}else{
				dojo.removeClass(expando, "dijitTreeExpandoOpened"); 
				dojo.addClass(expando, "dijitTreeExpandoClosed"); 
			}
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
