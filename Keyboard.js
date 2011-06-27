define(["dojo/_base/declare", "dojo/on", "./List"], function(declare, listen, List){
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
		this.on("keydown", function(event){
			var nextFocus = event.target;
			if(nextFocus.type && !delegatingInputTypes[nextFocus.type]){
				// text boxes and other inputs that can use direction keys should be ignored and not affect cell/row navigation
				return;
			}
			var keyCode = event.keyCode;
			var move = {
				33: -grid.pageSkip, // page up
				34: grid.pageSkip,// page down
				37: -1, // left
				38: -1, // up
				39: 1, // right
				40: 1, // down
				35: 10000, //end
				36: -10000 // home
			}[keyCode];
			if(!move){
				return;
			}
			var nextSibling, columnId, cell = grid.cell(nextFocus).element;
			if(keyCode == 37 || keyCode == 39){
				// horizontal movement (left and right keys)
				nextFocus = cell;
			}else{
				// other keys are vertical
				columnId = cell && cell.columnId;
				nextFocus = grid.row(nextFocus).element;				
			}
			do{
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
			}while(nextSibling && move);
			if(nextFocus){
				if(columnId){
					nextFocus = grid.cell(nextFocus, columnId).element;
				}
				if(nextFocus.getAttributeNode("tabIndex").specified){
					nextFocus.focus();
				}else{
					var inputs = nextFocus.getElementsByTagName("input");
					for(var i = 0;i < inputs.length; i++){
						if(inputs[i].tabIndex != -1){
							inputs[i].focus();
							break;
						}
					}
				}
			}
			event.preventDefault();
			
		});
	}
});
});