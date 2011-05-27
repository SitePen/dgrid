define(["dojo/on"], function(listen){

return function(settings){
	// summary:
	// 		Add a column with text editing capability
	var originalRenderCell = settings.renderCell || function(object, value, td){
		if(value != null){
			td.appendChild(document.createTextNode(value));
		}
	};
	settings.renderCell = function(object, value, td){
		originalRenderCell(object, value, td);
		listen(td, "focus", function(event){
			td.removeChild(td.firstChild);
			var input = dojo.create("input",{
				type:"text",
				className: "d-list-text-input",
				value: value
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
							value = object[settings.field] = thisInput.value;
							grid.store.put(object);
							originalRenderCell(value, td);
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


