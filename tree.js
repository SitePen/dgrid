define(["dojo/_base/declare", "dojo/_base/Deferred", "dojo/query", "dojo/on", "dojo/aspect", "dojo/has!touch?./util/touch", "put-selector/put"],
function(declare, Deferred, querySelector, on, aspect, touchUtil, put){

return function(column){
	// summary:
	//      Add a editing capability
	var originalRenderCell = column.renderCell || function(object, value, td){
		if(value != null){
			put(td, "span.dgrid-expando-text", value);
		}
	};
	
	// Variable to track item level on last renderCell call(s)
	// (for transferring information between renderCell and aspected insertRow).
	var currentLevel;
	
	column.shouldExpand = column.shouldExpand || function(row, level, previouslyExpanded){
		// summary:
		//		Function called after each row is inserted to determine whether
		//		expand(rowElement, true) should be automatically called.
		//		The default implementation re-expands any rows that were expanded
		//		the last time they were rendered (if applicable).
		
		return previouslyExpanded;
	};
	
	aspect.after(column, "init", function(){
		var grid = column.grid,
			transitionEventSupported,
			tr, query;
		
		var colSelector = ".dgrid-content .dgrid-column-" + column.id;
		// Set up the event listener once and use event delegation for better memory use.
		grid.on(column.expandOn || ".dgrid-expando-icon:click," + colSelector + ":dblclick," + colSelector + ":keydown",
			function(event){
				if(event.type != "keydown" || event.keyCode == 32){
					grid.expand(this); 
				}
			});
		
		if(touchUtil){
			// Also listen on double-taps of the cell.
			grid.on(touchUtil.selector(colSelector, touchUtil.dbltap),
				function(){ grid.expand(this); });
		}
		
		grid._expanded = {}; // Stores IDs of expanded rows
		
		aspect.after(grid, "insertRow", function(rowElement){
			// Auto-expand (shouldExpand) considerations
			var row = this.row(rowElement),
				expanded = column.shouldExpand(row, currentLevel, this._expanded[row.id]);
			
			if(expanded){ this.expand(rowElement, true); }
			return rowElement; // pass return value through
		});
		
		aspect.before(grid, "removeRow", function(rowElement, justCleanup){
			var connected = rowElement.connected;
			if(connected){
				// if it has a connected expando node, we process the children
				querySelector(">.dgrid-row", connected).forEach(function(element){
					grid.removeRow(element);
				});
				// now remove the connected container node
				if(!justCleanup){
					put(connected, "!");
				}
			}
		});
		grid._calcRowHeight = function(rowElement){
			// we override this method so we can provide row height measurements that
			// include the children of a row
			var connected = rowElement.connected;
			// if connected, need to consider this in the total row height
			return rowElement.offsetHeight + (connected ? connected.offsetHeight : 0); 
		};
		
		grid.expand = function(target, expand){
			target = target.element || target; // if a row object was passed in, get the element first 
			target = target.className.indexOf("dgrid-expando-icon") > -1 ? target :
				querySelector(".dgrid-expando-icon", target)[0];
			if(target.mayHaveChildren){
				// on click we toggle expanding and collapsing
				var expanded = target.expanded = expand === undefined ? !target.expanded : expand;
				// update the expando display
				target.className = "dgrid-expando-icon ui-icon ui-icon-triangle-1-" + (expanded ? "se" : "e"); 
				var preloadNode = target.preloadNode,
					row = grid.row(target),
					rowElement = row.element,
					container;
				if(!preloadNode){
					// if the children have not been created, create a container, a preload node and do the 
					// query for the children
					container = rowElement.connected = put('div.dgrid-tree-container');//put(rowElement, '+...
					preloadNode = target.preloadNode = put(rowElement, '+', container, 'div.dgrid-preload');
					var query = function(options){
						return grid.store.getChildren(row.data, options);
					};
					query.level = target.level;
					Deferred.when(
						grid.renderQuery ?
							grid._trackError(function(){
								return grid.renderQuery(query, preloadNode);
							}) :
							grid.renderArray(query({}), preloadNode),
								function(){
									container.style.height = container.scrollHeight + "px";
								});
					var transitionend = function(event){
						var height = this.style.height;
						if(height){
							// after expansion, ensure display is correct, and we set it to none for hidden containers to improve performance
							this.style.display = height == "0px" ? "none" : "block";
						}
						if(event){
							// now we need to reset the height to be auto, so future height changes 
							// (from children expansions, for example), will expand to the right height
							// However setting the height to auto or "" will cause an animation to zero height for some
							// reason, so we set the transition to be zero duration for the time being
							put(this, ".dgrid-tree-resetting");
							setTimeout(function(){
								// now we can turn off the zero duration transition after we have let it render
								put(container, "!dgrid-tree-resetting");
							});
							// this was triggered as a real event, we remember that so we don't fire the setTimeout's in the future
							transitionEventSupported = true;
						}else if(!transitionEventSupported){
							// if this was not triggered as a real event, we remember that so we shortcut animations
							transitionEventSupported = false;
						}
						// now set the height to auto
						this.style.height = "";
					};
					on(container, "transitionend,webkitTransitionEnd,oTransitionEnd,MSTransitionEnd", transitionend);
					if(!transitionEventSupported){
						setTimeout(function(){
							transitionend.call(container);
						}, 600);
					}
				}
				// show or hide all the children
				
				container = rowElement.connected;
				var containerStyle = container.style;
				container.hidden = !expanded;
				// make sure it is visible so we can measure it
				if(transitionEventSupported === false){
					containerStyle.display = expanded ? "block" : "none";
					containerStyle.height = "";
				}else{
					if(expanded){
						containerStyle.display = "block";
						var scrollHeight = container.scrollHeight;
						containerStyle.height = "0px";
					}
					else{
						// if it will be hidden we need to be able to give a full height without animating it, so it has the right starting point to animate to zero
						put(container, ".dgrid-tree-resetting");
						containerStyle.height = container.scrollHeight + "px";
					}
					// we now allow a transitioning						
					if(!expanded || scrollHeight){
						setTimeout(function(){
							put(container, "!dgrid-tree-resetting");
							containerStyle.height = (expanded ? scrollHeight : 0) + "px";
						});
					}
				}
				
				// Update _expanded map.
				if(expanded){
					this._expanded[row.id] = true;
				}else{
					delete this._expanded[row.id];
				}
			}
		};
	});
	
	column.renderCell = function(object, value, td, options){
		// summary:
		//		Renders a cell that can be expanded, creating more rows
		var level = Number(options.query.level) + 1;
		level = currentLevel = isNaN(level) ? 0 : level;
		var grid = this.grid;
		var mayHaveChildren = !grid.store.mayHaveChildren || grid.store.mayHaveChildren(object);
		// create the expando
		var dir = grid.isRTL ? "right" : "left";
		
		var expando = put(td, "div.dgrid-expando-icon" + (mayHaveChildren ? ".ui-icon.ui-icon-triangle-1-e" : "") +
			"[style=margin-" + dir + ": " + (level * 19) + "px; float: " + dir + "]");
		expando.innerHTML = "&nbsp;"; // for opera to space things properly
		originalRenderCell.call(this, object, value, td, options);
		expando.level = level;
		expando.mayHaveChildren = mayHaveChildren;
	};
	return column;
};
});