define(["dojo/listen"], function(listen){

return function(settings){
	// summary:
	// 		Add a column with text editing capability
	var originalRenderCell = settings.renderCell || function(data, td){
		if(data != null){
			td.appendChild(document.createTextNode(data));
		}
	};
	settings.renderCell = function(data, td){
		originalRenderCell(data, td);
		listen(td, "focus", function(event){
			td.removeChild(td.firstChild);
			var input = dojo.create("input",{
				type:"text",
				className: "dojoxGridxTextInput",
				value: data
			}, td);
			input.focus();
			var grid = settings.grid;
			var id = grid.row(event).id;
			input.onblur = input.onchange = function(){
				if(input){
					var thisInput = input;
					input = null;
					if(grid.store){
						dojo.when(grid.store.get(id), function(object){ 
							data = object[settings.field] = thisInput.value;
							grid.store.put(object);
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


