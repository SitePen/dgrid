define([
	"dojo/_base/declare",
	"dojo/aspect",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/has",
	"put-selector/put",
	"dojo/_base/Deferred",
	"dojo/_base/sniff"
], function(declare, aspect, on, lang, has, put, Deferred){

var delegatingInputTypes = {
		checkbox: 1,
		radio: 1,
		button: 1
	},
	hasGridCellClass = /\bdgrid-cell\b/,
	hasGridRowClass = /\bdgrid-row\b/;

has.add("dom-contains", function(global, doc, element){
	return !!element.contains; // not supported by FF < 9
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

var Keyboard = declare(null, {
	// summary:
	//		Adds keyboard navigation capability to a list or grid.
	
	// pageSkip: Number
	//		Number of rows to jump by when page up or page down is pressed.
	pageSkip: 10,
	
	tabIndex: 0,
	
	// keyMap: Object
	//		Hash which maps key codes to functions to be executed (in the context
	//		of the instance) for key events within the grid's body.
	keyMap: null,
	
	// headerKeyMap: Object
	//		Hash which maps key codes to functions to be executed (in the context
	//		of the instance) for key events within the grid's header row.
	headerKeyMap: null,
	
	postMixInProperties: function(){
		this.inherited(arguments);
		
		if(!this.keyMap){
			this.keyMap = lang.mixin({}, Keyboard.defaultKeyMap);
		}
		if(!this.headerKeyMap){
			this.headerKeyMap = lang.mixin({}, Keyboard.defaultHeaderKeyMap);
		}
	},
	
	postCreate: function(){
		this.inherited(arguments);
		var grid = this;
		
		function handledEvent(event){
			// text boxes and other inputs that can use direction keys should be ignored and not affect cell/row navigation
			var target = event.target;
			return target.type && (!delegatingInputTypes[target.type] || event.keyCode == 32);
		}

		function enableNavigation(areaNode){
			var cellNavigation = grid.cellNavigation,
				isFocusableClass = cellNavigation ? hasGridCellClass : hasGridRowClass,
				isHeader = areaNode === grid.headerNode,
				initialNode = areaNode;

			function initHeader(){
				initialNode = cellNavigation ? grid.headerNode.getElementsByTagName("th")[0] : grid.headerNode;
				if(initialNode){
					// Set up the tab stop and listen for a focus event in case the user uses the tab key to
					// move focus.
					initialNode.tabIndex = grid.tabIndex;
					grid._removeFocusSignal(true);
					var signal = grid._listenNodeFocus(initialNode, true);
					grid._setFocusNodes({tabStopNode: initialNode, signal: signal}, true);
				}
			}

			if(isHeader){
				// Initialize header now (since it's already been rendered),
				// and aspect after future renderHeader calls to reset focus.
				initHeader();
				aspect.after(grid, "renderHeader", initHeader, true);
			}else{
				aspect.after(grid, "renderArray", function(ret){
					// summary:
					//		Ensures the first element of a grid is always keyboard selectable after data has been
					//		retrieved if there is not already a valid focused element.

					return Deferred.when(ret, function(ret){
						if(!grid._getFocusNodes().tabStopNode){
							var tabStopNode = initialNode;
							// do not update the focused element if we already have a valid one
							if(!isFocusableClass.test(tabStopNode.className) || !contains(areaNode, tabStopNode)){
								// ensure that the focused element is actually a grid cell, not a
								// dgrid-preload or dgrid-content element, which should not be focusable,
								// even when data is loaded asynchronously
								for(var i = 0, elements = areaNode.getElementsByTagName("*"), element; (element = elements[i]); ++i){
									if(isFocusableClass.test(element.className)){
										tabStopNode = element;
										break;
									}
								}
							}
							// Set up the tab stop and listen for a focus event in case the user uses the tab key to
							// move focus
							grid._removeFocusSignal();
							tabStopNode.tabIndex = grid.tabIndex;
							var signal = grid._listenNodeFocus(tabStopNode);
							grid._setFocusNodes({tabStopNode: element, signal: signal});
						}
						return ret;
					});
				});
			}

			grid._listeners.push(on(areaNode, "mousedown", function(event){
				if(!handledEvent(event)){
					grid._focusOnNode(event.target, isHeader, event);
				}
			}));

			grid._listeners.push(on(areaNode, "keydown", function(event){
				// For now, don't squash browser-specific functionalities by letting
				// ALT and META function as they would natively
				if(event.metaKey || event.altKey) {
					return;
				}

				var handler = grid[isHeader ? "headerKeyMap" : "keyMap"][event.keyCode];

				// Text boxes and other inputs that can use direction keys should be ignored and not affect cell/row navigation
				if(handler && !handledEvent(event)){
					handler.call(grid, event);
				}
			}));
		}

		if(this.tabableHeader){
			enableNavigation(this.headerNode);
			on(this.headerNode, "dgrid-cellfocusin", function(){
				grid.scrollTo({ x: this.scrollLeft });
			});
		}
		enableNavigation(this.contentNode);

		// When a row is updated, one row is removed and another is inserted.
		// Aspect removeRow to record info about the old row so focus can be restored to the new node.
		aspect.before(this, "removeRow", function(row){
			// The focus and tab index need to survive a row update.
			// If a row contains the focus, then it will always contain the tab stop.  But a tab stop row
			// may not have the focus.  So look for the tab stop row first.
			var tabStopNode = this._getFocusNodes().tabStopNode;
			if(tabStopNode){
				var tabStopRow = this.row(tabStopNode);
				// Is the tab stop node in the row being removed?
				if(tabStopRow && tabStopRow.element === row){
					this._removeFocusSignal();
					// Save the row id.
					var restoreRowData = this._restoreRowData = {
						rowId: row.id,
						tabIndex: row.tabIndex
					};
					// If tab stop is on a cell, record the column id as well.
					if(this.cellNavigation){
						var column = this.cell(tabStopNode).column;
						if(column){
							restoreRowData.columnId = column.id;
							restoreRowData.tabIndex = tabStopNode.tabIndex;
						}
					}
					// Record whether or not the node is focused.
					if (this._getFocusNodes().hasFocus){
						restoreRowData.restoreFocus = true;
					}
				}else{
					this._restoreRowData = undefined;
				}
			}
		}, true);

		aspect.after(this, "insertRow", function(row){
			var restoreRowData = this._restoreRowData;
			this._restoreRowData = undefined;
			// Does the row being inserted correspond to the row that was last removed?
			if(restoreRowData && restoreRowData.rowId === row.id){
				var node,
					tabIndex = restoreRowData.tabIndex;
				// Determine if the tab stop was on the row or on a cell in the row.
				if(restoreRowData.columnId == null){
					node = row;
				}else{
					node = this.cell(row, restoreRowData.columnId).element;
				}
				node.tabIndex = tabIndex;

				// Determine whether or not the node had focus.
				if(restoreRowData.restoreFocus){
					// Set focus and the tab stop on the element.
					this.focus(node);
				}else{
					// The node did not have focus.  Handle the focus event if the user
					// uses the tab key to return to the node.
					var signal = this._listenNodeFocus(node);

					// Remember the node as a tab stop only.
					this._setFocusNodes({tabStopNode: node, signal: signal});
				}
			}
			return row;
		});
	},

	destroy: function(){
		// Clean up the focus signal if it is still hanging around.
		this._removeFocusSignal();
		this._removeFocusSignal(true);
		this.inherited(arguments);
	},

	addKeyHandler: function(key, callback, isHeader){
		// summary:
		//		Adds a handler to the keyMap on the instance.
		//		Supports binding additional handlers to already-mapped keys.
		// key: Number
		//		Key code representing the key to be handled.
		// callback: Function
		//		Callback to be executed (in instance context) when the key is pressed.
		// isHeader: Boolean
		//		Whether the handler is to be added for the grid body (false, default)
		//		or the header (true).

		// Aspects may be about 10% slower than using an array-based appraoch,
		// but there is significantly less code involved (here and above).
		return aspect.after( // Handle
			this[isHeader ? "headerKeyMap" : "keyMap"], key, callback, true);
	},

	// Returns an object used to track the node that has focus and the tab stop node for either the
	// rows or the header.
	_getFocusNodes: function(isHeader){
		var property = "_focusNodes" + (isHeader ? "Header" : ""),
			focusNodes = this[property];
		return focusNodes || (this[property] = {});
	},

	// Sets an object used to track the node that has focus and the tab stop node for either the
	// rows or the header.  The object properties are:
	// tabStopNode - the current tab stop node.
	// hasFocus - the tab stop node has focus.
	// signal - a signal waiting for a blur event or a focus event depending on whether or not
	// the tabStopNode has focus or not.
	_setFocusNodes: function(nodesObj, isHeader){
		var property = "_focusNodes" + (isHeader ? "Header" : "");
		this[property] = nodesObj;
	},

	// Respond to a node (a tabStopNode) receiving focus.
	_listenNodeFocus: function(element, isHeader){
		var grid = this;
		return on(element, "focus", function(event){
			// Call _focusOnNode so the styles and metadata is all updated.
			grid._focusOnNode(element, isHeader);
		});
	},

	// Remove the active signal for a node in a row or a header.
	_removeFocusSignal: function(isHeader){
		var focusNodes = this._getFocusNodes(isHeader),
			signal = focusNodes.signal;
		if(signal){
			signal.remove();
			focusNodes.signal = undefined;
		}
	},

	_focusOnNode: function(element, isHeader, event){
		var focusNodes = this._getFocusNodes(isHeader),
			tabStopNode = focusNodes.tabStopNode,
			hasFocus = focusNodes.hasFocus,
			cellOrRowType = this.cellNavigation ? "cell" : "row",
			cell = this[cellOrRowType](element),
			signal,
			inputs,
			input,
			numInputs,
			inputFocused,
			i,
			grid = this;

		function buildEvent(event){
			event = lang.mixin({ grid: this }, event);
			if(event.type){
				event.parentType = event.type;
			}
			if(!event.bubbles){
				// IE doesn't always have a bubbles property already true.
				// Opera throws if you try to set it to true if it is already true.
				event.bubbles = true;
			}
			return event;
		}

		// Remove any saved focus restore info.
		this._removeFocusSignal(isHeader);
		this._restoreRowData = undefined;

		element = cell && cell.element;
		if(!element){ return; }

		if(this.cellNavigation){
			inputs = element.getElementsByTagName("input");
			for(i = 0, numInputs = inputs.length; i < numInputs; i++){
				input = inputs[i];
				if((input.tabIndex != -1 || "lastValue" in input) && !input.disabled){
					// Employ workaround for focus rectangle in IE < 8
					if(has("ie") < 8){ input.style.position = "relative"; }
					input.focus();
					if(has("ie") < 8){ input.style.position = ""; }
					inputFocused = true;
					break;
				}
			}
		}

		event = buildEvent(event);
		put(tabStopNode, "[!tabIndex]");
		if(hasFocus){
			this._handleBlur(tabStopNode, isHeader, event);
		}
		// Set up a listener for blur events to clean up any styles and emit custom events.
		signal = on(element, "blur", function(event){
			grid._removeFocusSignal(isHeader);
			grid._handleBlur(element, isHeader, buildEvent(event));

			// Handle when focus returns via the tab key.
			grid._getFocusNodes(isHeader).signal = grid._listenNodeFocus(element, isHeader);
		});

		// Expose object representing focused cell or row gaining focus, via
		// event.cell or event.row; which is set depends on cellNavigation.
		// Note that yes, the same event object is being reused; on.emit
		// performs a shallow copy of properties into a new event object.
		event[cellOrRowType] = cell;
		
		if(!inputFocused){
			if(has("ie") < 8){
				// setting the position to relative magically makes the outline
				// work properly for focusing later on with old IE.
				// (can't be done a priori with CSS or screws up the entire table)
				element.style.position = "relative";
			}
			element.tabIndex = this.tabIndex;
			element.focus();
		}
		// Keep track of the current tab stop and the focused node within the rows and the header so they can move
		// as the user clicks around in the list or grid.  They are tracked separately because when the focus
		// moves outside of this widget, the tab stop needs to remain the same.
		this._setFocusNodes({tabStopNode: element, hasFocus: true, signal: signal}, isHeader);

		put(element, ".dgrid-focus");
		on.emit(element, "dgrid-cellfocusin", event);
	},

	_handleBlur: function(element, isHeader, event){
		if (element){
			var focusNodes = this._getFocusNodes(isHeader),
				cellOrRowType = this.cellNavigation ? "cell" : "row";

			// Clean up previously-focused element
			// Remove the class name and the tabIndex attribute
			put(element, "!dgrid-focus");
			if(has("ie") < 8){
				// Clean up after workaround below (for non-input cases)
				element.style.position = "";
			}

			// Expose object representing focused cell or row losing focus, via
			// event.cell or event.row; which is set depends on cellNavigation.
			event[cellOrRowType] = this[cellOrRowType](element);
			on.emit(element, "dgrid-cellfocusout", event);

			// If focus has not moved to another cell/row, then set hasFocus to false.
			if(focusNodes.hasFocus && focusNodes.tabStopNode === element){
				focusNodes.hasFocus = false;
			}
		}
	},

	focusHeader: function(element){
		this._focusOnNode(element || this._getFocusNodes(true).tabStopNode, true);
	},
	
	focus: function(element){
		this._focusOnNode(element || this._getFocusNodes().tabStopNode, false);
	}
});

// Common functions used in default keyMap (called in instance context)

var moveFocusVertical = Keyboard.moveFocusVertical = function(event, steps){
	var cellNavigation = this.cellNavigation,
		target = this[cellNavigation ? "cell" : "row"](event),
		columnId = cellNavigation && target.column.id,
		next = this.down(this._getFocusNodes().tabStopNode, steps, true);
	
	// Navigate within same column if cell navigation is enabled
	if(cellNavigation){ next = this.cell(next, columnId); }
	this._focusOnNode(next, false, event);
	
	event.preventDefault();
};

var moveFocusUp = Keyboard.moveFocusUp = function(event){
	moveFocusVertical.call(this, event, -1);
};

var moveFocusDown = Keyboard.moveFocusDown = function(event){
	moveFocusVertical.call(this, event, 1);
};

var moveFocusPageUp = Keyboard.moveFocusPageUp = function(event){
	moveFocusVertical.call(this, event, -this.pageSkip);
};

var moveFocusPageDown = Keyboard.moveFocusPageDown = function(event){
	moveFocusVertical.call(this, event, this.pageSkip);
};

var moveFocusHorizontal = Keyboard.moveFocusHorizontal = function(event, steps){
	if(!this.cellNavigation){ return; }
	var isHeader = !this.row(event), // header reports row as undefined
		currentNode = this._getFocusNodes(isHeader).tabStopNode;
	
	this._focusOnNode(this.right(currentNode, steps), isHeader, event);
	event.preventDefault();
};

var moveFocusLeft = Keyboard.moveFocusLeft = function(event){
	moveFocusHorizontal.call(this, event, -1);
};

var moveFocusRight = Keyboard.moveFocusRight = function(event){
	moveFocusHorizontal.call(this, event, 1);
};

var moveHeaderFocusEnd = Keyboard.moveHeaderFocusEnd = function(event, scrollToBeginning){
	// Header case is always simple, since all rows/cells are present
	var nodes;
	if(this.cellNavigation){
		nodes = this.headerNode.getElementsByTagName("th");
		this._focusOnNode(nodes[scrollToBeginning ? 0 : nodes.length - 1], true, event);
	}
	// In row-navigation mode, there's nothing to do - only one row in header
	
	// Prevent browser from scrolling entire page
	event.preventDefault();
};

var moveHeaderFocusHome = Keyboard.moveHeaderFocusHome = function(event){
	moveHeaderFocusEnd.call(this, event, true);
};

var moveFocusEnd = Keyboard.moveFocusEnd = function(event, scrollToTop){
	// summary:
	//		Handles requests to scroll to the beginning or end of the grid.
	
	// Assume scrolling to top unless event is specifically for End key
	var self = this,
		cellNavigation = this.cellNavigation,
		contentNode = this.contentNode,
		contentPos = scrollToTop ? 0 : contentNode.scrollHeight,
		scrollPos = contentNode.scrollTop + contentPos,
		endChild = contentNode[scrollToTop ? "firstChild" : "lastChild"],
		hasPreload = endChild.className.indexOf("dgrid-preload") > -1,
		endTarget = hasPreload ? endChild[(scrollToTop ? "next" : "previous") + "Sibling"] : endChild,
		endPos = endTarget.offsetTop + (scrollToTop ? 0 : endTarget.offsetHeight),
		handle;
	
	if(hasPreload){
		// Find the nearest dgrid-row to the relevant end of the grid
		while(endTarget && endTarget.className.indexOf("dgrid-row") < 0){
			endTarget = endTarget[(scrollToTop ? "next" : "previous") + "Sibling"];
		}
		// If none is found, there are no rows, and nothing to navigate
		if(!endTarget){ return; }
	}
	
	// Grid content may be lazy-loaded, so check if content needs to be
	// loaded first
	if(!hasPreload || endChild.offsetHeight < 1){
		// End row is loaded; focus the first/last row/cell now
		if(cellNavigation){
			// Preserve column that was currently focused
			endTarget = this.cell(endTarget, this.cell(event).column.id);
		}
		this._focusOnNode(endTarget, false, event);
	}else{
		// In IE < 9, the event member references will become invalid by the time
		// _focusOnNode is called, so make a (shallow) copy up-front
		if(!has("dom-addeventlistener")){
			event = lang.mixin({}, event);
		}
		
		// If the topmost/bottommost row rendered doesn't reach the top/bottom of
		// the contentNode, we are using OnDemandList and need to wait for more
		// data to render, then focus the first/last row in the new content.
		handle = aspect.after(this, "renderArray", function(rows){
			handle.remove();
			return Deferred.when(rows, function(rows){
				var target = rows[scrollToTop ? 0 : rows.length - 1];
				if(cellNavigation){
					// Preserve column that was currently focused
					target = self.cell(target, self.cell(event).column.id);
				}
				self._focusOnNode(target, false, event);
			});
		});
	}
	
	if(scrollPos === endPos){
		// Grid body is already scrolled to end; prevent browser from scrolling
		// entire page instead
		event.preventDefault();
	}
};

var moveFocusHome = Keyboard.moveFocusHome = function(event){
	moveFocusEnd.call(this, event, true);
};

function preventDefault(event){
	event.preventDefault();
}

Keyboard.defaultKeyMap = {
	32: preventDefault, // space
	33: moveFocusPageUp, // page up
	34: moveFocusPageDown, // page down
	35: moveFocusEnd, // end
	36: moveFocusHome, // home
	37: moveFocusLeft, // left
	38: moveFocusUp, // up
	39: moveFocusRight, // right
	40: moveFocusDown // down
};

// Header needs fewer default bindings (no vertical), so bind it separately
Keyboard.defaultHeaderKeyMap = {
	32: preventDefault, // space
	35: moveHeaderFocusEnd, // end
	36: moveHeaderFocusHome, // home
	37: moveFocusLeft, // left
	39: moveFocusRight // right
};

return Keyboard;
});