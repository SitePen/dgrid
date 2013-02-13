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

return declare(null, {
	// summary:
	//		Add keyboard navigation capability to a grid/list
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
		
		function handleHeaderEndScroll(event){
			// Header case is always simple, since all rows/cells are present
			var scrollToBeginning = event.keyCode === 36,
				nodes;
			if(grid.cellNavigation){
				nodes = grid.headerNode.getElementsByTagName("th");
				grid.focusHeader(nodes[scrollToBeginning ? 0 : nodes.length - 1]);
			}
			// In row-navigation mode, there's nothing to do - only one row in header
			
			// Prevent browser from scrolling entire page
			event.preventDefault();
		}
		
		function handleEndScroll(event, columnId){
			// summary:
			//		Handles requests to scroll to the beginning or end of the grid.
			
			// Assume scrolling to top unless event is specifically for End key
			var scrollToTop = event.keyCode === 36,
				cellNavigation = grid.cellNavigation,
				contentNode = grid.contentNode,
				contentPos = scrollToTop ? 0 : contentNode.scrollHeight,
				scrollPos = contentNode.scrollTop + contentPos,
				endChild = contentNode[scrollToTop ? "firstChild" : "lastChild"],
				hasPreload = endChild.className.indexOf("dgrid-preload") > -1,
				endTarget = hasPreload ? endChild[(scrollToTop ? "next" : "previous") + "Sibling"] : endChild,
				endPos = endTarget.offsetTop + (scrollToTop ? 0 : endTarget.offsetHeight),
				handle;
			
			// Grid content may be lazy-loaded, so check if content needs to be
			// loaded first
			if(!hasPreload || endChild.offsetHeight < 1){
				// End row is loaded; focus the first/last row/cell now
				if(cellNavigation){
					// Preserve column that was currently focused
					endTarget = grid.cell(endTarget, columnId);
				}
				grid.focus(endTarget);
			}else{
				// If the topmost/bottommost row rendered doesn't reach the top/bottom of
				// the contentNode, we are using OnDemandList and need to wait for more
				// data to render, then focus the first/last row in the new content.
				handle = aspect.after(grid, "renderArray", function(rows){
					handle.remove();
					return Deferred.when(rows, function(rows){
						var target = rows[scrollToTop ? 0 : rows.length - 1];
						if(cellNavigation){
							// Preserve column that was currently focused
							target = grid.cell(target, columnId);
						}
						grid.focus(target);
					});
				});
			}
			
			if(scrollPos === endPos){
				// Grid body is already scrolled to end; prevent browser from scrolling
				// entire page instead
				event.preventDefault();
			}
		}
		
		function navigateArea(areaNode){
			var isFocusableClass = grid.cellNavigation ? hasGridCellClass : hasGridRowClass,
				cellFocusedElement = areaNode,
				next;
			
			function focusOnCell(element, event, dontFocus){
				var cellOrRowType = grid.cellNavigation ? "cell" : "row",
					cell = grid[cellOrRowType](element);
				
				element = cell && cell.element;
				if(!element){ return; }
				event = lang.mixin({ grid: grid }, event);
				if(event.type){
					event.parentType = event.type;
				}
				if(!event.bubbles){
					// IE doesn't always have a bubbles property already true.
					// Opera throws if you try to set it to true if it is already true.
					event.bubbles = true;
				}
				// clean up previously-focused element
				// remove the class name and the tabIndex attribute
				put(cellFocusedElement, "!dgrid-focus[!tabIndex]");
				if(cellFocusedElement){
					if(has("ie") < 8){
						// clean up after workaround below (for non-input cases)
						cellFocusedElement.style.position = "";
					}
					
					// Expose object representing focused cell or row losing focus, via
					// event.cell or event.row; which is set depends on cellNavigation.
					event[cellOrRowType] = grid[cellOrRowType](cellFocusedElement);
					on.emit(element, "dgrid-cellfocusout", event);
				}
				cellFocusedElement = element;
				
				// Expose object representing focused cell or row gaining focus, via
				// event.cell or event.row; which is set depends on cellNavigation.
				// Note that yes, the same event object is being reused; on.emit
				// performs a shallow copy of properties into a new event object.
				event[cellOrRowType] = cell;
				
				if(!dontFocus){
					if(has("ie") < 8){
						// setting the position to relative magically makes the outline
						// work properly for focusing later on with old IE.
						// (can't be done a priori with CSS or screws up the entire table)
						element.style.position = "relative";
					}
					element.tabIndex = grid.tabIndex;
					element.focus();
				}
				put(element, ".dgrid-focus");
				on.emit(cellFocusedElement, "dgrid-cellfocusin", event);
			}
			
			while((next = cellFocusedElement.firstChild) && !isFocusableClass.test(next.className)){
				cellFocusedElement = next;
			}
			if(next){ cellFocusedElement = next; }
			
			if(areaNode === grid.contentNode){
				aspect.after(grid, "renderArray", function(ret){
					// summary:
					//		Ensures the first element of a grid is always keyboard selectable after data has been
					//		retrieved if there is not already a valid focused element.
					
					return Deferred.when(ret, function(ret){
						// do not update the focused element if we already have a valid one
						if(isFocusableClass.test(cellFocusedElement.className) && contains(areaNode, cellFocusedElement)){
							return ret;
						}
						
						// ensure that the focused element is actually a grid cell, not a
						// dgrid-preload or dgrid-content element, which should not be focusable,
						// even when data is loaded asynchronously
						for(var i = 0, elements = areaNode.getElementsByTagName("*"), element; (element = elements[i]); ++i){
							if(isFocusableClass.test(element.className)){
								cellFocusedElement = element;
								break;
							}
						}
						
						cellFocusedElement.tabIndex = grid.tabIndex;
						
						return ret;
					});
				});
			}else if(isFocusableClass.test(cellFocusedElement.className)){
				cellFocusedElement.tabIndex = grid.tabIndex;
			}
			
			grid._listeners.push(on(areaNode, "mousedown", function(event){
				if(!handledEvent(event)){
					focusOnCell(event.target, event);
				}
			}));
			
			grid._listeners.push(on(areaNode, "keydown", function(event){
				// For now, don't squash browser-specific functionalities by letting
				// ALT and META function as they would natively
				if(event.metaKey || event.altKey) {
					return;
				}
				
				var keyCode = event.keyCode,
					isHeader = areaNode === grid.headerNode;
				
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
					40: 1 // down
				}[keyCode];
				if(isNaN(move)){
					// Handle home and end specially - may need to wait for rows to load
					if(keyCode === 35 || keyCode === 36){
						(isHeader ? handleHeaderEndScroll : handleEndScroll)(event,
							grid.cellNavigation && grid.cell(cellFocusedElement).column.id);
					}
					return;
				}
				var nextSibling, columnId, cell = grid.cell(cellFocusedElement);
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
					cell = grid.row(cellFocusedElement);
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
					focusOnCell(nextFocus, event, inputFocused);
				}
				event.preventDefault();
			}));
			
			return function(target){
				target = target || cellFocusedElement;
				focusOnCell(target, { target: target });
			}
		}
		
		if(this.tabableHeader){
			this.focusHeader = navigateArea(this.headerNode);
		}
		
		this.focus = navigateArea(this.contentNode);
	}
});
});
