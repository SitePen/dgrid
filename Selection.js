define(["dojo/Stateful"], function(Stateful){
return function(table, options){
	// summary:
	// 		Add selection capabilities to a table
	// returns:
	// 		A stateful object (get/set/watch) where the property names correspond to 
	// 		object ids and values are true or false depending on whether an item is selected 
	var mode = (options && options.mode) || "extended";
	dojo.connect(table.contentNode, "click", function(e){
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
	});
	var selection = new Stateful();
	selection.watch(function(id, oldValue, value){
		dojo[value ? "addClass" : "removeClass"](table.getRowNode(id), "dijitTreeRowSelected");
	});
	return selection;
};
});