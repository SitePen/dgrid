define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/Deferred",
	"dojo/query",
	"dojo/on",
	"dojo/aspect",
	"./util/has-css3",
	"./Grid",
	"dojo/has!touch?./util/touch",
	"put-selector/put"
], function(declare, lang, arrayUtil, Deferred, querySelector, on, aspect, has, Grid, touchUtil, put){

	return declare(null, {

		constructor: function(){
			this._treeColumnListeners = [];
		},

		shouldExpand: function(row, level, previouslyExpanded){
			// summary:
			//		Function called after each row is inserted to determine whether
			//		expand(rowElement, true) should be automatically called.
			//		The default implementation re-expands any rows that were expanded
			//		the last time they were rendered (if applicable).

			return previouslyExpanded;
		},

		expand: function(target, expand, noTransition){
			// summary:
			//		Expands the row corresponding to the given target.
			// target: Object
			//		Row object (or something resolvable to one) to expand/collapse.
			// expand: Boolean?
			//		If specified, designates whether to expand or collapse the row;
			//		if unspecified, toggles the current state.
			if(!this._treeColumn){
				// Do nothing, there is no tree column defined.
				return;
			}

			var grid = this,
				row = target.element ? target : this.row(target),
				hasTransitionend = has("transitionend"),
				promise;

			target = row.element;
			target = target.className.indexOf("dgrid-expando-icon") > -1 ? target :
				querySelector(".dgrid-expando-icon", target)[0];

			if(target && target.mayHaveChildren &&
				(noTransition || expand !== !!this._expanded[row.id])){
				// toggle or set expand/collapsed state based on optional 2nd argument
				var expanded = expand === undefined ? !this._expanded[row.id] : expand;

				// update the expando display
				put(target, ".ui-icon-triangle-1-" + (expanded ? "se" : "e") +
					"!ui-icon-triangle-1-" + (expanded ? "e" : "se"));

				var preloadNode = target.preloadNode,
					rowElement = row.element,
					container,
					containerStyle,
					scrollHeight,
					options = {};

				if(!preloadNode){
					// if the children have not been created, create a container, a preload node and do the
					// query for the children
					container = rowElement.connected = put('div.dgrid-tree-container');//put(rowElement, '+...
					preloadNode = target.preloadNode = put(rowElement, '+', container, 'div.dgrid-preload');
					var query = function(options){
						var childCollection = grid._renderedCollection.getChildren(row.data);
						if(grid.sort){
							childCollection = childCollection.sort(grid.sort);
						}
						if('start' in options){
							var rangeArgs = [ options.start ];
							if('count' in options){
								rangeArgs.push(options.start + options.count);
							}
							childCollection = childCollection.range.apply(childCollection, rangeArgs);
						}
						if(childCollection.track){
							options.rows = [];

							childCollection = childCollection.track();

							// remember observation handles so they can be removed when the parent row is destroyed
							container._handles = [
								childCollection.tracking,
								grid._observeCollection(childCollection, container, options.rows, options)
							];
						}
						return childCollection;
					};
					// Include level information on query for renderQuery case
					if("level" in target){
						query.level = target.level;
					}
					// Add the query to the promise chain
					promise = (this.renderQuery ?
						this.renderQuery(query, preloadNode) :
						this._trackError(function(){
							return grid.renderCollection(
								query(options),
								preloadNode,
								lang.mixin(
									{ rows: options.rows },
										"level" in query ? { queryLevel: query.level } : null
								)
							);
						})
						).then(function(){
							// Expand once results are retrieved, if the row is still expanded.
							if(grid._expanded[row.id] && hasTransitionend){
								var scrollHeight = container.scrollHeight;
								container.style.height = scrollHeight ? scrollHeight + "px" : "auto";
							}
						});

					if(hasTransitionend){
						on.once(container, hasTransitionend, this._handleTransitionEnd);
					}else{
						this._handleTransitionEnd.call(container);
					}
				}

				// Show or hide all the children.

				container = rowElement.connected;
				container.hidden = !expanded;
				containerStyle = container.style;

				// make sure it is visible so we can measure it
				if(!hasTransitionend || noTransition){
					containerStyle.display = expanded ? "block" : "none";
					containerStyle.height = "";
				}else{
					if(expanded){
						containerStyle.display = "block";
						scrollHeight = container.scrollHeight;
						containerStyle.height = "0px";
					}
					else{
						// if it will be hidden we need to be able to give a full height
						// without animating it, so it has the right starting point to animate to zero
						put(container, ".dgrid-tree-resetting");
						containerStyle.height = container.scrollHeight + "px";
					}
					// Perform a transition for the expand or collapse.
					setTimeout(function(){
						put(container, "!dgrid-tree-resetting");
						containerStyle.height =
							expanded ? (scrollHeight ? scrollHeight + "px" : "auto") : "0px";
					}, 0);
				}

				// Update _expanded map.
				if(expanded){
					this._expanded[row.id] = true;
				}else{
					delete this._expanded[row.id];
				}
			}

			// Always return a promise
			return Deferred.when(promise);
		},

		_configColumns: function(prefix, columns){
			var columnArray = this.inherited(arguments);

			for(var i = 0, l = columnArray.length; i < l; i++){
				if(columnArray[i].tree){
					this._configureTreeColumn(columnArray[i]);
					break; // Allow only one tree column.
				}
			}
			return columnArray;
		},

		insertRow: function(){
			var rowElement = this.inherited(arguments);

			// Auto-expand (shouldExpand) considerations
			var row = this.row(rowElement),
				expanded = this.shouldExpand(row, this._currentLevel, this._expanded[row.id]);

			if(expanded){
				this.expand(rowElement, true, true);
			}

			return rowElement; // pass return value through
		},

		removeRow: function(rowElement, justCleanup){
			var connected = rowElement.connected;
			if(connected){
				if(connected._handles){
					arrayUtil.forEach(connected._handles, function(handle){
						handle.remove();
					});
					delete connected._handles;
				}

				// if it has a connected expando node, we process the children
				querySelector(">.dgrid-row", connected).forEach(function(element){
					this.removeRow(element, true);
				}, this);
				// now remove the connected container node
				if(!justCleanup){
					put(connected, "!");
				}
			}

			this.inherited(arguments);
		},

		cleanup: function(){
			this.inherited(arguments);

			if(this._treeColumn && this._treeColumn.collapseOnRefresh){
				// Clear out the _expanded hash on each call to cleanup
				// (which generally coincides with refreshes, as well as destroy).
				this._expanded = {};
			}
		},

		_destroyColumns: function(){
			var listeners = this._treeColumnListeners;

			for(var i = listeners.length; i--;){
				listeners[i].remove();
			}
			this._treeColumnListeners = [];
			this._treeColumn = null;
		},

		_calcRowHeight: function(rowElement){
			if(this._treeColumn){
				// Override this method to provide row height measurements that
				// include the children of a row
				var connected = rowElement.connected;
				// if connected, need to consider this in the total row height
				return rowElement.offsetHeight + (connected ? connected.offsetHeight : 0);
			}else{
				return this.inherited(arguments);
			}
		},

		_configureTreeColumn: function(column){
			// summary:
			//		Adds tree navigation capability to a column.

			var originalRenderCell = column.renderCell || Grid.defaultRenderCell;

			var clicked; // tracks row that was clicked (for expand dblclick event handling)

			if(!column){
				column = {};
			}
			this._treeColumn = column;

			var grid = this,
				colSelector = ".dgrid-content .dgrid-column-" + column.id;

			if(!grid.collection){
				throw new Error("dgrid tree column plugin requires a collection to operate.");
			}

			if(!column.renderExpando){
				column.renderExpando = grid._defaultRenderExpando;
			}

			// Set up the event listener once and use event delegation for better memory use.
			this._treeColumnListeners.push(grid.on(
						column.expandOn || ".dgrid-expando-icon:click," + colSelector + ":dblclick," + colSelector + ":keydown",
					function(event){
						var row = grid.row(event);
						if((!grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(row.data)) &&
							(event.type != "keydown" || event.keyCode == 32) && !(event.type == "dblclick" && clicked && clicked.count > 1 &&
							row.id == clicked.id && event.target.className.indexOf("dgrid-expando-icon") > -1)){
							grid.expand(row);
						}

						// If the expando icon was clicked, update clicked object to prevent
						// potential over-triggering on dblclick (all tested browsers but IE < 9).
						if(event.target.className.indexOf("dgrid-expando-icon") > -1){
							if(clicked && clicked.id == grid.row(event).id){
								clicked.count++;
							}else{
								clicked = {
									id: grid.row(event).id,
									count: 1
								};
							}
						}
					})
			);

			if(has("touch")){
				// Also listen on double-taps of the cell.
				this._treeColumnListeners.push(grid.on(touchUtil.selector(colSelector, touchUtil.dbltap),
					function(){
						grid.expand(this);
					}));
			}

			// Set up hash to store IDs of expanded rows
			if(!grid._expanded){
				grid._expanded = {};
			}

			column.renderCell = function(object, value, td, options){
				// summary:
				//		Renders a cell that can be expanded, creating more rows

				var grid = column.grid,
					level = Number(options && options.queryLevel) + 1,
					mayHaveChildren = !grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(object),
					expando, node;

				level = grid._currentLevel = isNaN(level) ? 0 : level;
				expando = column.renderExpando(level, mayHaveChildren,
					grid._expanded[grid.collection.getIdentity(object)], object);
				expando.level = level;
				expando.mayHaveChildren = mayHaveChildren;

				node = originalRenderCell.call(column, object, value, td, options);
				if(node && node.nodeType){
					put(td, expando);
					put(td, node);
				}else{
					td.insertBefore(expando, td.firstChild);
				}
			};
		},

		_defaultRenderExpando: function(level, hasChildren, expanded, object){
			// summary:
			//		Provides default implementation for column.renderExpando.

			var dir = this.grid.isRTL ? "right" : "left",
				cls = ".dgrid-expando-icon",
				node;
			if(hasChildren){
				cls += ".ui-icon.ui-icon-triangle-1-" + (expanded ? "se" : "e");
			}
			node = put("div" + cls + "[style=margin-" + dir + ": " +
				(level * (this.indentWidth || 9)) + "px; float: " + dir + "]");
			node.innerHTML = "&nbsp;"; // for opera to space things properly
			return node;
		},

		_handleTransitionEnd: function(event){
			var container = this,
				height = this.style.height;
			if(height){
				// After expansion, ensure display is correct;
				// after collapse, set display to none to improve performance
				this.style.display = height == "0px" ? "none" : "block";
			}

			// Reset height to be auto, so future height changes (from children
			// expansions, for example), will expand to the right height.
			if(event){
				// For browsers with CSS transition support, setting the height to
				// auto or "" will cause an animation to zero height for some
				// reason, so temporarily set the transition to be zero duration
				put(this, ".dgrid-tree-resetting");
				setTimeout(function(){
					// Turn off the zero duration transition after we have let it render
					put(container, "!dgrid-tree-resetting");
				},0);
			}
			// Now set the height to auto
			this.style.height = "";
		}
	});
});
