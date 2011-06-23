define(["dojo/_base/declare", "dojo/on"], function(declare, listen, query){
return declare([], {
	// summary:
	// 		Add keyboard navigation capability to a grid
	postCreate: function(){
		this.inherited(arguments);
		var grid = this;
		this.on("keydown", function(event){
			if(event.target.tagName.toLowerCase() == "input"){
				return;
			}
			var nextFocus, lastFocus = event.target;
			var columnId = lastFocus.columnId;
			switch(event.keyCode){
				case 37: // left arrow
					var previous = true;
				case 39:// right arrow
					nextFocus = lastFocus;
					columnId = null;
					break;
				case 38: // up arrow
					var previous = true;
					// fall through 
				case 40: // down arrow
					nextFocus = grid.row(lastFocus).element;
					break;
				default: // not an arrow key, just go to default
					return;
			}
			do{
				nextFocus = nextFocus[previous ? 'previousSibling' : 'nextSibling'];
			}while(nextFocus && nextFocus.nodeType != 1);
			if(nextFocus){
				if(columnId){
					nextFocus = grid.cell(nextFocus, columnId).element;
				}
				nextFocus.focus();
			}
			event.preventDefault();
			
		});
	}
});
});