define(["dojo/_base/declare", "dojo/on", "./List", "dojo/_base/sniff", "xstyle/put"], function(declare, listen, List, has, put){
var delegatingInputTypes = {
	checkbox: 1,
	radio: 1,
	button: 1
};
return declare([List], {
	// summary:
	// 		Add keyboard navigation capability to a grid/list
	pageSkip: 10,
	postCreate: function(){
		this.inherited(arguments);
		var grid = this;
		var cellFocusedElement;
		function focusOnCell(element, event, dontFocus){
			var cell = grid[grid.cellNavigation ? "cell" : "row"](element);
			if(cell){
				element = cell.element;
				if(element){
					if(!event.bubbles){
						// IE doesn't always have a bubbles property already true, Opera will throw an error if you try to set it to true if it is already true
						event.bubbles = true;
					}
					if(cellFocusedElement){
						put(cellFocusedElement, "!dgrid-focus[!tabIndex]"); // remove the class name and the tabIndex attribute
						if(has("ie") < 8){
							cellFocusedElement.style.position = "";
						}
						event.cell = cellFocusedElement;
						listen.emit(element, "cellfocusout", event);
					}
					cellFocusedElement = element;
					event.cell = element;
					if(!dontFocus){
						if(has("ie") < 8){
							// setting the position to relative (can't be done a priori with CSS or 
							// screws up the entire table), magically makes the outline work 
							// properly for focusing later on with old IE
							element.style.position = "relative";
						}
						element.tabIndex = 0;
						element.focus();
					}
					put(element, ".dgrid-focus");
					listen.emit(element, "cellfocusin", event);
				}
			}
		}
		listen(this.contentNode, "mousedown", function(event){
			focusOnCell(event.target, event);
		});
		this.on("keydown", function(event){
			if(cellFocusedElement){
				var focusedElement = event.target;
				var keyCode = event.keyCode;
				if(focusedElement.type && (!delegatingInputTypes[focusedElement.type] || keyCode == 32)){
					// text boxes and other inputs that can use direction keys should be ignored and not affect cell/row navigation
					return;
				}
				var move = {
					32: 0, // space bar
					33: -grid.pageSkip, // page up
					34: grid.pageSkip,// page down
					37: -1, // left
					38: -1, // up
					39: 1, // right
					40: 1, // down
					35: 10000, //end
					36: -10000 // home
				}[keyCode];
				if(isNaN(move)){
					return;
				}
				var nextSibling, columnId, cell = grid.cell(cellFocusedElement);
				var orientation;
				if(keyCode == 37 || keyCode == 39){
					if(!grid.cellNavigation){
						return;
					}
					// horizontal movement (left and right keys)
					orientation = 'right';
				}else{
					// other keys are vertical
					orientation = 'down'
					columnId = cell && cell.column && cell.column.id;
					cell = grid.row(cellFocusedElement);				
				}
				if(move){
					cell = grid[orientation](cell, move);
				}
				var nextFocus = cell && cell.element;
				if(nextFocus){
					if(columnId){
						nextFocus = grid.cell(nextFocus, columnId).element;
					}
					if(grid.cellNavigation){
						var inputs = nextFocus.getElementsByTagName("input");
						var inputFocused;
						for(var i = 0;i < inputs.length; i++){
							if(inputs[i].tabIndex != -1){
								inputs[i].focus();
								inputFocused = true;
								break;
							}
						}
					}
					focusOnCell(nextFocus, event, inputFocused);
				}
				event.preventDefault();
			}
		});
	}
});
});