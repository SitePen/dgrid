define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/aspect',
	'dojo/Deferred',
	'dojo/dom-construct',
	'dojo/dom-class',
	'dojo/on',
	'dojo/promise/all',
	'dojo/query',
	'dojo/when',
	'./util/has-css3',
	'./Grid',
	'dojo/has!touch?./util/touch'
], function (declare, lang, arrayUtil, aspect, Deferred, domConstruct, domClass, on, all, querySelector, when, has,
			 Grid, touchUtil) {

	return declare(null, {
		// collapseOnRefresh: Boolean
		//		Whether to collapse all expanded nodes any time refresh is called.
		collapseOnRefresh: false,

		// enableTreeTransitions: Boolean
		//		Enables/disables all expand/collapse CSS transitions.
		enableTreeTransitions: true,

		// treeIndentWidth: Number
		//		Width (in pixels) of each level of indentation.
		treeIndentWidth: 9,

		constructor: function () {
			this._treeColumnListeners = [];
		},

		shouldExpand: function (row, level, previouslyExpanded) {
			// summary:
			//		Function called after each row is inserted to determine whether
			//		expand(rowElement, true) should be automatically called.
			//		The default implementation re-expands any rows that were expanded
			//		the last time they were rendered (if applicable).

			return previouslyExpanded;
		},

		expand: function (target, expand, noTransition, lastRowsFirst) {
			// summary:
			//		Expands the row corresponding to the given target.
			// target: Object
			//		Row object (or something resolvable to one) to expand/collapse.
			// expand: Boolean?
			//		If specified, designates whether to expand or collapse the row;
			//		if unspecified, toggles the current state.

			if (!this._treeColumn) {
				return;
			}

			var grid = this,
				row = target.element ? target : this.row(target),
				isExpanded = !!this._expanded[row.id],
				hasTransitionend = has('transitionend'),
				promise;

			function processScroll() {
				if (!expanded) {
					grid._processScroll && grid._processScroll();
				}
			}

			target = row.element;
			target = target.className.indexOf('dgrid-expando-icon') > -1 ? target :
				querySelector('.dgrid-expando-icon', target)[0];

			noTransition = noTransition || !this.enableTreeTransitions;

			if (target && target.mayHaveChildren && (noTransition || expand !== isExpanded)) {
				// toggle or set expand/collapsed state based on optional 2nd argument
				var expanded = expand === undefined ? !this._expanded[row.id] : expand;

				// Update _expanded map.
				var pos = this.getScrollPosition();
				this._resetExpanded(row.id, expanded);

				// update the expando display
				domClass.replace(target, 'ui-icon-triangle-1-' + (expanded ? 'se' : 'e'),
					'ui-icon-triangle-1-' + (expanded ? 'e' : 'se'));
				domClass.toggle(row.element, 'dgrid-row-expanded', expanded);

				var rowElement = row.element,
					container = rowElement.connected,
					containerStyle,
					scrollHeight,
					options = {};

				if (!container) {
					// if the children have not been created, create a container, a preload node and do the
					// query for the children
					container = options.container = rowElement.connected =
						domConstruct.create('div', { className: 'dgrid-tree-container' }, rowElement, 'after');
					var query = function (options) {
						var childCollection = grid._renderedCollection.getChildren(row.data),
							results;
						if (grid.sort && grid.sort.length > 0) {
							childCollection = childCollection.sort(grid.sort);
						}
						if (childCollection.track && grid.shouldTrackCollection) {
							container._rows = options.rows = [];

							childCollection = childCollection.track();

							// remember observation handles so they can be removed when the parent row is destroyed
							container._handles = [
								childCollection.tracking,
								grid._observeCollection(childCollection, container, options)
							];
						}
						query.collection = childCollection;
						if ('start' in options) {
							var rangeArgs = {
								start: options.start,
								end: options.start + options.count
							};
							results = childCollection.fetchRange(rangeArgs);
						} else {
							results = childCollection.fetch();
						}
						return results;
					};
					if ('level' in target) {
						// Include level information on query for renderQuery case;
						// include on container for insertRow to detect in other cases
						container.level = query.level = target.level + 1;
					}

					// Add the query to the promise chain
					if (this.renderQuery) {
						if (lastRowsFirst) {
							promise = grid._renderedCollection.getChildren(row.data)
								.fetchRange({ start: 0, end: 1 }).totalLength.then(function (total) {
									options.start = total - grid.minRowsPerPage;
									options.end = total - 1;
									options.count = grid.minRowsPerPage;

									grid._previousScrollPosition = pos;

									return grid.renderQuery(query, options);
								});
						} else {
							promise = this.renderQuery(query, options);
						}

					}
					else {
						// If not using OnDemandList, we don't need preload nodes,
						// but we still need a beforeNode to pass to renderArray,
						// so create a temporary one
						var firstChild = domConstruct.create('div', null, container);
						promise = this._trackError(function () {
							return grid.renderQueryResults(
								query(options),
								firstChild,
								lang.mixin({ rows: options.rows },
									'level' in query ? { queryLevel: query.level } : null
								)
							).then(function (rows) {
								domConstruct.destroy(firstChild);
								return rows;
							});
						});
					}

					if (hasTransitionend) {
						// Update height whenever a collapse/expand transition ends.
						// (This handler is only registered when each child container is first created.)
						on(container, hasTransitionend, this._onTreeTransitionEnd);
					}
				}

				// Show or hide all the children.

				container.hidden = !expanded;
				containerStyle = container.style;

				// make sure it is visible so we can measure it
				if (!hasTransitionend || noTransition) {
					containerStyle.display = expanded ? 'block' : 'none';
					containerStyle.height = '';
					processScroll();
				}
				else {
					on.once(container, hasTransitionend, processScroll);
					if (expanded) {
						containerStyle.display = 'block';
						scrollHeight = container.scrollHeight;
						containerStyle.height = '0px';
					}
					else {
						// if it will be hidden we need to be able to give a full height
						// without animating it, so it has the right starting point to animate to zero
						domClass.add(container, 'dgrid-tree-resetting');
						containerStyle.height = container.scrollHeight + 'px';
					}
					// Perform a transition for the expand or collapse.
					setTimeout(function () {
						domClass.remove(container, 'dgrid-tree-resetting');
						containerStyle.height =
							expanded ? (scrollHeight ? scrollHeight + 'px' : 'auto') : '0px';
					}, 0);
				}
			}

			// Always return a promise
			return when(promise);
		},

		_configColumns: function () {
			var columnArray = this.inherited(arguments);

			// Set up hash to store IDs of expanded rows (here rather than in
			// _configureTreeColumn so nothing breaks if no column has renderExpando)
			this._resetExpanded();

			for (var i = 0, l = columnArray.length; i < l; i++) {
				if (columnArray[i].renderExpando) {
					this._configureTreeColumn(columnArray[i]);
					break; // Allow only one tree column.
				}
			}
			return columnArray;
		},

		insertRow: function (object, container, beforeNode, i, options) {
			options = options || {};

			var level = options.queryLevel = 'queryLevel' in options ? options.queryLevel :
				'level' in container ? container.level : 0;

			var rowElement = this.inherited(arguments);

			// Auto-expand (shouldExpand) considerations
			var row = this.row(rowElement),
				expanded = this.shouldExpand(row, level, this._expanded[row.id]);

			if (expanded) {
				this._expandWhenInDom(rowElement, options);
			}

			if (expanded || (!this.collection.mayHaveChildren || this.collection.mayHaveChildren(object))) {
				domClass.add(rowElement, 'dgrid-row-expandable');
			}

			return rowElement; // pass return value through
		},

		_expandWhenInDom: function (rowElement, options, dfd) {
			// Expand a row after it has been inserted into the DOM.  This is necessary because
			// the OnDemandList code that manages the preload nodes needs the nodes to be in the DOM
			// to create a correctly ordered linked list.;

			if (rowElement.offsetHeight) {
				var expandPromise = this.expand(rowElement, true, true, options.scrollingUp);
				if (dfd) {
					expandPromise.then(function () {
						dfd.resolve();
					});
				}
			} else {
				if (rowElement.parentNode && this.domNode.offsetHeight) {
					if (this._expandPromises && !dfd) {
						dfd = new Deferred();
						this._expandPromises.push(dfd.promise);
					}
					// Continue to try to expand the row only while it is inserted into a document fragment.
					setTimeout(this._expandWhenInDom.bind(this, rowElement, options, dfd), 0);
				}
			}
		},

		_queueNodeForDeletion: function (node) {
			this.inherited(arguments);

			var connected = node.connected;
			if (connected) {
				this._deleteQueue.push(connected);
			}
		},

		_pruneRow: function (rowElement, removeBelow) {
			var connected = rowElement.connected;
			var preloadNode;
			var preload;
			if (connected) {
				var rowId = this.row(rowElement).id;
				if (this._expanded[rowId]) {
					preloadNode = querySelector('>.dgrid-preload', connected)[removeBelow ? 1 : 0];
					if (preloadNode) {
						preload = this._findPreload(preloadNode);
						preload = removeBelow ? preload.next : preload.previous;
						if (!preload.expandedContent) {
							preload.expandedContent = {};
						}
						preload.expandedContent[rowId] = connected.offsetHeight;
					}
				}
			}

			this.inherited(arguments, [rowElement, removeBelow, {
				treePrune: true,
				removeBelow: removeBelow
			}]);
		},

		refresh: function (options) {
			// Restoring the previous scroll position with OnDemandList is not possible in some cases with
			// nested expanded nodes.  In those cases, restoring the position would require scrolling and
			// loading rows incrementally to make sure the expanded rows are loaded and expanded.  dgrid is not
			// currently written to do that.  If there are expanded rows, then do not allow the position to be
			// restored.
			var refreshResult;
			this._expandPromises = [];
			var keepScrollPosition = this.keepScrollPosition || (options && options.keepScrollPosition);
			if (keepScrollPosition && Object.keys(this._expanded).length) {
				refreshResult = this.inherited(arguments, lang.mixin(options || {}, { keepScrollPosition: false }));
			} else {
				refreshResult = this.inherited(arguments);
			}
			return when(refreshResult).then(function () {
				var promises = this._expandPromises;
				delete this._expandPromises;
				return all(promises);
			}.bind(this));
		},

		removeRow: function (rowElement, preserveDom, options) {
			var connected = rowElement.connected,
				childOptions = {},
				childRows,
				preloadNodes,
				firstIndex,
				lastIndex;
			if (connected) {
				if (connected._handles) {
					arrayUtil.forEach(connected._handles, function (handle) {
						handle.remove();
					});
					delete connected._handles;
				}

				if (connected._rows) {
					childOptions.rows = connected._rows;
				}

				childRows = querySelector('>.dgrid-row', connected);
				preloadNodes = querySelector('>.dgrid-preload', connected);
				if (childRows && childRows.length) {

					if (this._releaseRange) {
						firstIndex = childRows[0].rowIndex;
						lastIndex = childRows[childRows.length - 1].rowIndex;
						this._releaseRange(this._findPreload(preloadNodes[0]), false, firstIndex, lastIndex);
					}

					childRows.forEach(function (element) {
						if (options && options.treePrune) {
							this._pruneRow(element, options.removeBelow);
						} else {
							this.removeRow(element, true, childOptions);
						}
					}, this);
				}
				this._removePreloads && this._removePreloads(preloadNodes);

				if (connected._rows) {
					connected._rows.length = 0;
					delete connected._rows;
				}

				if (preserveDom) {
					this._queueNodeForDeletion(connected);
				} else {
					domConstruct.destroy(connected);
				}
			}

			this.inherited(arguments);
		},

		_refreshCellFromItem: function (cell, item) {
			if (!cell.column.renderExpando) {
				return this.inherited(arguments);
			}

			this.inherited(arguments, [cell, item, {
				queryLevel: querySelector('.dgrid-expando-icon', cell.element)[0].level
			}]);
		},

		cleanup: function () {
			this.inherited(arguments);

			if (this.collapseOnRefresh) {
				// Clear out the _expanded hash on each call to cleanup
				// (which generally coincides with refreshes, as well as destroy)
				this._resetExpanded();
			}
		},

		_destroyColumns: function () {
			this.inherited(arguments);
			var listeners = this._treeColumnListeners;

			for (var i = listeners.length; i--;) {
				listeners[i].remove();
			}
			this._treeColumnListeners = [];
			this._treeColumn = null;
		},

		_calcRowHeight: function (rowElement) {
			// Override this method to provide row height measurements that
			// include the children of a row
			var connected = rowElement.connected;
			// if connected, need to consider this in the total row height
			return this.inherited(arguments) + (connected ? connected.offsetHeight : 0);
		},

		_configureTreeColumn: function (column) {
			// summary:
			//		Adds tree navigation capability to a column.

			var grid = this;
			var colSelector = '.dgrid-content .dgrid-column-' + column.id;
			var clicked; // tracks row that was clicked (for expand dblclick event handling)

			this._treeColumn = column;
			if (!column._isConfiguredTreeColumn) {
				var originalRenderCell = column.renderCell || this._defaultRenderCell;
				column._isConfiguredTreeColumn = true;
				column.renderCell = function (object, value, td, options) {
					// summary:
					//		Renders a cell that can be expanded, creating more rows

					var level = options && 'queryLevel' in options ? options.queryLevel : 0,
						mayHaveChildren = !grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(object),
						expando, node;

					expando = column.renderExpando(level, mayHaveChildren,
						grid._expanded[grid.collection.getIdentity(object)], object);
					expando.level = level;
					expando.mayHaveChildren = mayHaveChildren;

					node = originalRenderCell.call(column, object, value, td, options);
					if (node && node.nodeType) {
						td.appendChild(expando);
						td.appendChild(node);
					}
					else {
						td.insertBefore(expando, td.firstChild);
					}
				};

				if (typeof column.renderExpando !== 'function') {
					column.renderExpando = this._defaultRenderExpando;
				}
			}

			var treeColumnListeners = this._treeColumnListeners;
			if (treeColumnListeners.length === 0) {
				// Set up the event listener once and use event delegation for better memory use.
				treeColumnListeners.push(this.on(column.expandOn ||
					'.dgrid-expando-icon:click,' + colSelector + ':dblclick,' + colSelector + ':keydown',
					function (event) {
						var row = grid.row(event);
						if ((!grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(row.data)) &&
							(event.type !== 'keydown' || event.keyCode === 32) && !(event.type === 'dblclick' &&
							clicked && clicked.count > 1 && row.id === clicked.id &&
							event.target.className.indexOf('dgrid-expando-icon') > -1)) {
							grid.expand(row);
						}

						// If the expando icon was clicked, update clicked object to prevent
						// potential over-triggering on dblclick (all tested browsers but IE < 9).
						if (event.target.className.indexOf('dgrid-expando-icon') > -1) {
							if (clicked && clicked.id === grid.row(event).id) {
								clicked.count++;
							}
							else {
								clicked = {
									id: grid.row(event).id,
									count: 1
								};
							}
						}
					})
				);

				if (has('touch')) {
					// Also listen on double-taps of the cell.
					treeColumnListeners.push(this.on(touchUtil.selector(colSelector, touchUtil.dbltap),
						function () {
							grid.expand(this);
						}));
				}
			}
		},

		_defaultRenderExpando: function (level, hasChildren, expanded) {
			// summary:
			//		Default implementation for column.renderExpando.
			//		NOTE: Called in context of the column definition object.
			// level: Number
			//		Level of indentation for this row (0 for top-level)
			// hasChildren: Boolean
			//		Whether this item may have children (in most cases this determines
			//		whether an expando icon should be rendered)
			// expanded: Boolean
			//		Whether this item is currently in expanded state
			// object: Object
			//		The item that this expando pertains to

			var dir = this.grid.isRTL ? 'right' : 'left',
				cls = 'dgrid-expando-icon';
			if (hasChildren) {
				cls += ' ui-icon ui-icon-triangle-1-' + (expanded ? 'se' : 'e');
			}
			return domConstruct.create('div', {
				className: cls,
				innerHTML: '&nbsp;',
				style: 'margin-' + dir + ': ' + (level * this.grid.treeIndentWidth) + 'px; float: ' + dir + ';'
			});
		},

		_onNotification: function (rows, event) {
			if (event.type === 'delete') {
				this._resetExpanded(event.id);
			}
			this.inherited(arguments);
		},

		_onTreeTransitionEnd: function (event) {
			var container = this,
				height = this.style.height;
			if (height) {
				// After expansion, ensure display is correct;
				// after collapse, set display to none to improve performance
				this.style.display = height === '0px' ? 'none' : 'block';
			}

			// Reset height to be auto, so future height changes (from children
			// expansions, for example), will expand to the right height.
			if (event) {
				// For browsers with CSS transition support, setting the height to
				// auto or "" will cause an animation to zero height for some
				// reason, so temporarily set the transition to be zero duration
				domClass.add(this, 'dgrid-tree-resetting');
				setTimeout(function () {
					// Turn off the zero duration transition after we have let it render
					domClass.remove(container, 'dgrid-tree-resetting');
				}, 0);
			}
			// Now set the height to auto
			this.style.height = '';
		},

		_resetPlaceHolder: function (rowId) {
			var headPreload = this._getHeadPreload && this._getHeadPreload();
			var preload;
			var grid = this;

			if (!headPreload) {
				return;
			}

			function remove(rowId) {
				var preload = headPreload;
				while (preload) {
					var expandedContent = preload.expandedContent;
					if (expandedContent && expandedContent[rowId]) {
						delete expandedContent[rowId];
						grid._adjustPreloadHeight(preload);
						return;
					}
					preload = preload.next;
				}
			}

			if (rowId != null) {
				remove(rowId);
			} else {
				preload = headPreload;
				while (preload) {
					if (preload.expandedContent) {
						delete preload.expandedContent;
						grid._adjustPreloadHeight(preload);
					}
					preload = preload.next;
				}
			}
		},

		_resetExpanded: function (rowId, expanded) {
			// Always remove the place holder(s).
			this._resetPlaceHolder(rowId);
			if (rowId == null) {
				this._expanded = {};
			} else {
				if (expanded) {
					this._expanded[rowId] = true;
				} else {
					delete this._expanded[rowId];
				}
			}
		},

		_calculatePreloadHeight: function (preload) {
			var newHeight = this.inherited(arguments);
			var expandedContent = preload.expandedContent;
			if (expandedContent) {
				Object.keys(expandedContent).forEach(function (key) {
					newHeight += expandedContent[key];
				});
			}
			return newHeight;
		},

		_getRenderedCollection: function (preload) {
			if (preload.level) {
				return preload.query.collection;
			} else {
				return this.inherited(arguments);
			}
		}
	});
});
