dojo.provide("dojox.table.TextEdit");
dojo.require("dojo.Stateful");

dojox.table.TextEdit = function(settings){
	// summary:
	// 		Add text-box based editing to a column
	var originalRenderCell = settings.renderCell || function(data, td){
		td.appendChild(document.createTextNode(data));
	};
	settings.renderCell = function(data, td){
		originalRenderCell(data, td);
		dojo.connect(td, "dblclick", function(){
			td.removeChild(td.firstChild);
			var input = dojo.create("input",{
				type:"text",
				value: data
			}, td);
			input.focus();
			var table = settings.table;
			input.onblur = input.onchange = function(){
				if(input){
					var thisInput = input;
					input = null;
					if(table.store){
						dojo.when(table.store.get(table.getObjectId(td)), function(object){ 
							data = object[settings.field] = thisInput.value;
							table.store.put(object);
							originalRenderCell(data, td);
						});
					}
					td.removeChild(thisInput);
				}
			}
		});
	};
	return settings;
};
