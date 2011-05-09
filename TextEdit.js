define(["dojo/listen"], function(listen){

return function(settings){
	// summary:
	// 		Add a checkbox column
	var originalRenderCell = settings.renderCell || function(data, td){
		td.appendChild(document.createTextNode(data));
	};
	settings.renderCell = function(data, td){
		originalRenderCell(data, td);
		listen(td, "dblclick", function(event){
			td.removeChild(td.firstChild);
			var input = dojo.create("input",{
				type:"text",
				value: data
			}, td);
			input.focus();
			var table = settings.table;
			var id = table.row(event).id;
			input.onblur = input.onchange = function(){
				if(input){
					var thisInput = input;
					input = null;
					if(table.store){
						dojo.when(table.store.get(id), function(object){ 
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
});


