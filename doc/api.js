define(["dojo", "dojo/on", "xstyle/put", "dgrid/OnDemandGrid","dgrid/Tree", "dgrid/Selection", "dgrid/Keyboard", "dojo/store/Memory"], 
function(dojo, on, put, Grid, Tree, Selection, Keyboard, Memory){
	return function(data, explorerElement){
		function getChildren(object){
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
			forProperty("parameters");
			if(object.additionalProperties){
				(object.properties = object.properties || {})["any property"] = object.additionalProperties; 
			}
			forProperty("properties");
			forProperty("modules");
			forProperty("methods");
			if(object.returns){
				if(object.constructor === true){
					children.concat(getChildren(object.returns));
				}else{
					var child = object.returns;
					child.docType= "returns";
					child.name = child.name || "returns";
					child.id = child.id || nextId++;
					children.push(child);
				}
			}
			return children;
		}
		var nextId = 1;
		store = new Memory({
			getChildren: getChildren,
			data: getChildren(data)
		});
		window.explorer = dojo.declare([Grid, Selection, Keyboard])({
			selectionMode: "single",
			store: store,
			columns: {
				docType: new Tree({
					name:'Part', 
					renderCell: function(object, value, td){
						put(td, "div.ui-icon.type.type-" + object.docType + "[title=" + object.docType + "]");
						put(td, "div.description", (object.name || "") + (object.type ? ':' + object.type : '') +
							(object["extends"] ? ' extends ' + (object["extends"].name || object["extends"]) : "") +
							(object.description ? ' - ' + object.description : "") + 
							(object["default"] !== undefined ? ' (Defaults to ' + object["default"] + ')' : ""));
					}
				})
			}
		}, explorerElement);
		on(explorer, "select", function(component){
			var details = dojo.byId("details");
			put(details, "div", component.description);
			put(details, "div", component.description);
			
		});
	};
});