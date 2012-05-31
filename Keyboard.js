define([
	"dojo/_base/declare",
	"dojo/aspect",
	"dojo/on",
	"./List",
	"dojo/_base/lang",
	"dojo/has",
	"put-selector/put",
	"dojo/_base/Deferred",
	"dojo/_base/sniff"
], function(declare, aspect, on, List, lang, has, put, Deferred){

var delegatingInputTypes = {
		checkbox: 1,
		radio: 1,
		button: 1
	},
	hasGridCellClass = /\bdgrid-cell\b/,
	hasGridRowClass = /\bdgrid-row\b/;

has.add("dom-contains", function(){
	return !!document.createElement("a").contains;
});

function contains(parent, node){
	// summary:
	//		Checks to see if an element is contained by another element.
	
	if(has("dom-contains")){
		return parent.contains(node);
	}else{
		return parent.compareDocumentPosition(node) & 8 /* DOCUMENT_POSITION_CONTAINS */;
	}
}

return declare([List], {
	// summary:
	// 		Add keyboard navigation capability to a grid/list
	pageSkip: 10,
	tabIndex: 0,
	
	postCreate: function(){
		this.inherited(arguments);
		var grid = this;
		function handledEvent(event){
			// text boxes and other inputs that can use direction keys should be ignored and not affect cell/row navigation
			var target = event.target;
			return target.type && (!delegatingInputTypes[target.type] || event.keyCode == 32);
		}
		
		function navigateArea(areaNode){
			var isFocusableClass = grid.cellNavigation ? hasGridCellClass : hasGridRowClass,
				next;

			if(!grid._cellFocusedElement){
				grid._cellFocusedElement = areaNode;

				while((next = grid._cellFocusedElement.firstChild) && next.tagName){
					grid._cellFocusedElement = next;
				}
			}

			if(areaNode === grid.contentNode){
				aspect.after(grid, "renderArray", function(ret){
					// summary:
					//		Ensures the first element of a grid is always keyboard selectable after data has been
					//		retrieved if there is not already a valid focused element.

					return Deferred.when(ret, function(ret){
						// do not update the focused element if we already have a valid one
						if(isFocusableClass.test(grid._cellFocusedElement.className) && contains(areaNode, grid._cellFocusedElement)){
							return ret;
						}

						// ensure that the focused element is actually a grid cell, not a
						// dgrid-preload or dgrid-content element, which should not be focusable,
						// even when data is loaded asynchronously
						for(var i = 0, elements = areaNode.getElementsByTagName("*"), element; (element = elements[i]); ++i){
							if(isFocusableClass.test(element.className)){
								grid._cellFocusedElement = element;
								break;
							}
						}

						grid._cellFocusedElement.tabIndex = grid.tabIndex;

						return ret;
					});
				});
			}else if(isFocusableClass.test(grid._cellFocusedElement.className)){
				grid._cellFocusedElement.tabIndex = grid.tabIndex;
			}
			
			on(areaNode, "mousedown", function(event){
				if(!handledEvent(event)){
					if(!event.bubbles){ event.bubbles = true; }
					grid.focusOnCell(event.target);
				}
			});
			
			on(areaNode, "keydown", function(event){
				// For now, don't squash browser-specific functionalities by letting
				// ALT and META function as they would natively
				if(event.metaKey || event.altKey) {
					return;
				}
				
				var focusedElement = event.target;
				var keyCode = event.keyCode;
				if(handledEvent(event)){
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
				var nextSibling, columnId, cell = grid.cell(grid._cellFocusedElement);
				var orientation;
				if(keyCode == 37 || keyCode == 39){
					// horizontal movement (left and right keys)
					if(!grid.cellNavigation){
						return; // do nothing for row-only navigation
					}
					orientation = "right";
				}else{
					// other keys are vertical
					orientation = "down";
					columnId = cell && cell.column && cell.column.id;
					cell = grid.row(grid._cellFocusedElement);
				}
				if(move){
					cell = cell && grid[orientation](cell, move, true);
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
							var input = inputs[i];
							if((input.tabIndex != -1 || "lastValue" in input) && !input.disabled){
								// focusing here requires the same workaround for IE<8,
								// though here we can get away with doing it all at once.
								if(has("ie") < 8){ input.style.position = "relative"; }
								input.focus();
								if(has("ie") < 8){ input.style.position = ""; }
								inputFocused = true;
								break;
							}
						}
					}
					if(!event.bubbles){ event.bubbles = true; }
					grid.focusOnCell(nextFocus, inputFocused);
				}
				event.preventDefault();
			});
		}
		
		if(grid.tabableHeader){
			navigateArea(grid.headerNode);
		}
		
		navigateArea(grid.contentNode);
	}
});
});
