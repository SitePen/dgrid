define(["dojo/_base/declare"], function(declare){

return declare([], {
	constructor: function(mixin){
		for(var i in mixin){
			this[i] = mixin[i];
		}
	},
	renderCell: function(data, td, options){
		// summary:
		//		Renders a cell that can be expanded, creating more rows
		var level = options.query.level + 1;
		level = isNaN(level) ? 0 : level;
		var expanded, table = this.table;
		// create the expando
		var expando = td.appendChild(document.createElement("div"));
		if(this.field){
			td.appendChild(document.createTextNode(data));
		}
		expando.className = "ui-icon ui-icon-triangle-1-e";
		expando.setAttribute("style", "margin-left: " + (level * 19) + "px; float: left");
		var tr, query;
		var preloadNode;
		expando.onclick = function(){
			// on click we toggle expanding and collapsing
			if(!preloadNode){
				// if the children have not been created, create a preload node and do the 
				// query for the children
				tr = td.parentNode;
				preloadNode = document.createElement("tr");
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
				expando.className = "ui-icon ui-icon-triangle-1-se";
			}else{
				expando.className = "ui-icon ui-icon-triangle-1-e";
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