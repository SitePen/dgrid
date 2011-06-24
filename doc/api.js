define(["dojo", "dojo/on", "xstyle/create", "d-list/OnDemandGrid","d-list/Tree", "d-list/Selection", "d-list/Keyboard", "dojo/store/Memory"], 
function(dojo, on, create, Grid, Tree, Selection, Keyboard, Memory){
	return function(data, explorerElement){
		var nextId = 1;
		store = new Memory({
			data: [data],
			getChildren: function(object){
				var children = [];
				function forProperty(property){
					for(var i in object[property]){
						var child = object[property][i];
						child.docType= property;
						child.id = child.id || nextId++;
						child.name = child.name || i;
						children.push(child);
					}
				}
				forProperty("properties");
				forProperty("modules");
				forProperty("methods");
				forProperty("parameters");
				if(object.returns){
					var child = object.returns;
					child.docType= "returns";
					child.name = child.name || "returns";
					child.id = child.id || nextId++;
					children.push(child);
				}
				return children;
			}
		});
		window.explorer = dojo.declare([Grid, Selection, Keyboard])({
			selectionMode: "single",
			store: store,
			columns: {
				docType: new Tree({
					name:'Part', 
					renderCell: function(object, value, td){
						create(td, ".ui-icon.type.type-" + object.docType + "[title=" + object.docType + "]");
						create(td, ".description", (object.name || "") + (object.type ? ':' + object.type : '') + ' - ' + (object.description || ""));
					}
				})
			}
		}, explorerElement);
		on(explorer, "select", function(component){
			var details = dojo.byId("details");
			create(details, "div", component.description);
			create(details, "div", component.description);
			
		});
	};
});