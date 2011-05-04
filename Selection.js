define(["dojo/Stateful", "dojo/listen"], function(Stateful, listen){
return function(table, options){
	// summary:
	// 		Add selection capabilities to a table
	// returns:
	// 		A stateful object (get/set/watch) where the property names correspond to 
	// 		object ids and values are true or false depending on whether an item is selected 
	var mode = (options && options.mode) || "extended";
	listen(table.contentNode, ".dojoxGridxRow:click, .dojoxGridxRow:keydown", function(e){
		if(e.type == "click" || e.keyCode == 32){
			if(e.keyCode == 32){
				e.preventDefault();
			}
			var id = table.getObjectId(e);
			switch(mode){
				case "single":
					for(var i in selection){
						if(selection.hasOwnProperty(i)){
							selection.set(i, false);
						}
					}
					selection.set(id, true);
					break;
				case "extended":
					selection.set(id, !selection[id]);
				 	break;
			}
		}
	});
	var selection = new Stateful();
	selection.watch(function(id, oldValue, value){
		dojo[value ? "addClass" : "removeClass"](table.getRowNode(id), "dojoxGridxRowSelected");
	});
	return selection;
};
});