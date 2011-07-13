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
				if(!event.bubbles){
					event.bubbles = true;
				}			
				if(cellFocusedElement){
					cellFocusedElement.className = cellFocusedElement.className.replace(/\s*dgrid-cell-focus/, '');
					cellFocusedElement.removeAttribute("tabIndex");
					event.cell = cellFocusedElement;
					listen.emit(element, "cellfocusout", event);
				}
				cellFocusedElement = element;
				event.cell = element;
				if(!dontFocus){
					element.tabIndex = 0;
					element.focus();
					if(has("ie") < 8){
						var outlineElementStyle = put(element, "div.dgrid-ie-outline").style;
						outlineElementStyle.left = element.offsetLeft - 1;
						outlineElementStyle.top = element.offsetTop - 1;
						outlineElementStyle.width = element.offsetWidth;
						outlineElementStyle.Height = element.offsetHeight;
					}
				}
				element.className += " dgrid-cell-focus";
				listen.emit(element, "cellfocusin", event);
			}
		}
		listen(this.contentNode, "mousedown", function(event){
			focusOnCell(event.target, event);
		});
		this.on("keydown", function(event){
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
			var nextFocus = move ? grid[orientation](cell, move).element : cell.element;
/*			do{
				// move in the correct direction
				if((nextSibling = nextFocus[move < 0 ? 'previousSibling' : 'nextSibling']) && !nextSibling.preload){
					nextFocus = nextSibling; 
					if(nextFocus.nodeType == 1){
						// it's an element, counts as a real move
						move += move < 0 ? 1 : -1;
					}
				}else{
					move = 0;
				}
			}while(nextSibling && move);*/
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
		});
	}
});
});