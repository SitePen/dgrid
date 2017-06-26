define([
	'./List',
	'./_StoreMixin',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-construct',
	'dojo/on',
	'dojo/when',
	'dojo/query',
	'./util/misc'
], function (List, _StoreMixin, declare, lang, domConstruct, on, when, query, miscUtil) {

	var preloadId = 0;

	function nextPreloadId() {
		return preloadId++;
	}

	function isRowNode(node) {
		return node && (node.className.indexOf('dgrid-row') >= 0 ||
			node.className.indexOf('dgrid-loading') >= 0);
	}

	function isPreloadNode(node) {
		return node && node.className.indexOf('dgrid-preload') >= 0;
	}

	return declare([List, _StoreMixin], {
		// summary:
		//		Extends List to include virtual scrolling functionality, querying a
		//		dojo/store instance for the appropriate range when the user scrolls.

		// minRowsPerPage: Integer
		//		The minimum number of rows to request at one time.
		minRowsPerPage: 25,

		// maxRowsPerPage: Integer
		//		The maximum number of rows to request at one time.
		maxRowsPerPage: 250,

		// maxEmptySpace: Integer
		//		Defines the maximum size (in pixels) of unrendered space below the
		//		currently-rendered rows. Setting this to less than Infinity can be useful if you
		//		wish to limit the initial vertical scrolling of the grid so that the scrolling is
		// 		not excessively sensitive. With very large grids of data this may make scrolling
		//		easier to use, albiet it can limit the ability to instantly scroll to the end.
		maxEmptySpace: Infinity,

		// bufferRows: Integer
		//	  The number of rows to keep ready on each side of the viewport area so that the user can
		//	  perform local scrolling without seeing the grid being built. Increasing this number can
		//	  improve perceived performance when the data is being retrieved over a slow network.
		bufferRows: 10,

		// farOffRemoval: Integer
		//		Defines the minimum distance (in pixels) from the visible viewport area
		//		rows must be in order to be removed.  Setting to Infinity causes rows
		//		to never be removed.
		farOffRemoval: 2000,

		// queryRowsOverlap: Integer
		//		Indicates the number of rows to overlap queries. This helps keep
		//		continuous data when underlying data changes (and thus pages don't
		//		exactly align)
		queryRowsOverlap: 0,

		// pagingMethod: String
		//		Method (from dgrid/util/misc) to use to either throttle or debounce
		//		requests.  Default is "debounce" which will cause the grid to wait until
		//		the user pauses scrolling before firing any requests; can be set to
		//		"throttleDelayed" instead to progressively request as the user scrolls,
		//		which generally incurs more overhead but might appear more responsive.
		pagingMethod: 'debounce',

		// pagingDelay: Integer
		//		Indicates the delay (in milliseconds) imposed upon pagingMethod, to wait
		//		before paging in more data on scroll events. This can be increased to
		//		reduce client-side overhead or the number of requests sent to a server.
		pagingDelay: miscUtil.defaultDelay,

		// keepScrollPosition: Boolean
		//		When refreshing the list, controls whether the scroll position is
		//		preserved, or reset to the top.  This can also be overridden for
		//		specific calls to refresh.
		keepScrollPosition: false,

		// rowHeight: Number
		//		Average row height, computed in renderQuery during the rendering of
		//		the first range of data.
		rowHeight: 0,

		// _deleteQueue: Array
		// 		List of DOM nodes queued for deletion.
		_deleteQueue: [],

		postCreate: function () {
			this.inherited(arguments);
			var self = this;
			// check visibility on scroll events
			on(this.bodyNode, 'scroll',
				miscUtil[this.pagingMethod](function (event) {
					self._processScroll(event);
				}, null, this.pagingDelay)
			);
		},

		renderQuery: function (query, options) {
			// summary:
			//		Creates a preload node for rendering a query into, and executes the query
			//		for the first page of data. Subsequent data will be downloaded as it comes
			//		into view.
			// query: Function
			//		Function to be called when requesting new data.
			// options: Object?
			//		Optional object containing the following:
			//		* container: Container to build preload nodes within; defaults to this.contentNode

			var self = this,
				container = (options && options.container) || this.contentNode,
				preload,
				topPreloadNode, preloadNode,
				queryLevel,
				preloadLevel = 0,
				start = (options && options.start) || 0;

			if ('level' in query) {
				preloadLevel = queryLevel = query.level;
			}

			preload = {
				query: query,
				count: 0,
				level: preloadLevel,
				top: false
			};

			// Initial query; set up top and bottom preload nodes
			var topPreload = {
				node: domConstruct.create('div', {
					className: 'dgrid-preload',
					style: { height: '0' }
				}, container),
				count: 0,
				query: query,
				next: preload,
				level: preloadLevel,
				top: true
			};
			topPreloadNode = topPreload.node;
			topPreloadNode.rowIndex = 0;
			preload.previous = topPreload;

			preloadNode = preload.node = domConstruct.create('div', {
				className: 'dgrid-preload',
				style: { height: '0' }
			}, container);

			// Add preload ids.
			topPreload.id = nextPreloadId();
			topPreloadNode.setAttribute('data-preloadid', topPreload.id);
			preload.id = nextPreloadId();
			preloadNode.setAttribute('data-preloadid', preload.id);

			// this preload node is used to represent the area of the grid that hasn't been
			// downloaded yet
			preloadNode.rowIndex = this.minRowsPerPage;

			self._insertPreload(topPreload);

			var loadingNode = domConstruct.create('div', {
					className: 'dgrid-loading'
				}, preloadNode, 'before'),
				innerNode = domConstruct.create('div', {
					className: 'dgrid-below'
				}, loadingNode);
			innerNode.innerHTML = this.loadingMessage;

			// Establish query options, mixing in our own
			options = lang.mixin({ start: 0, count: this.minRowsPerPage }, options);
			if (queryLevel != null) {
				options.queryLevel = queryLevel;
			}

			// Protect the query within a _trackError call, but return the resulting collection
			return this._trackError(function () {
				var results = query(options);

				// Render the result set
				return self.renderQueryResults(results, preloadNode, options).then(function (trs) {
					return results.totalLength.then(function (total) {
						var trCount = trs.length;
						var parentNode = preloadNode.parentNode;

						if (self._rows && !('queryLevel' in options)) {
							self._rows.min = 0;
							self._rows.max = trCount === total ? Infinity : trCount - 1;
						}

						domConstruct.destroy(loadingNode);
						if (!('queryLevel' in options)) {
							self._total = total;
						}
						// now we need to adjust the height and total count based on the first result set
						if (total === 0 && parentNode) {
							if (self.noDataNode) {
								domConstruct.destroy(self.noDataNode);
							}
							self._insertNoDataNode(parentNode);
						}

						topPreload.count = start;
						preload.count = total - trCount - start;
						preloadNode.rowIndex = start + trCount;

						if (total) {
							self._updatePreloadRowHeights(topPreload);
						} else {
							preloadNode.style.display = 'none';
							topPreloadNode.style.display = 'none';
						}

						if (self._previousScrollPosition && parentNode.offsetHeight) {
							// Restore position after a refresh operation w/ keepScrollPosition but only
							// if the rows have been inserted into the DOM.
							self.scrollTo(self._previousScrollPosition);
							delete self._previousScrollPosition;
						}

						// Redo scroll processing in case the query didn't fill the screen,
						// or in case scroll position was restored
						return when(self._processScroll()).then(function () {
							return trs;
						});
					});
				}).otherwise(function (err) {
					// remove the loadingNode and re-throw
					domConstruct.destroy(loadingNode);
					throw err;
				});
			});
		},

		_insertPreload: function (newTopPreload) {
			var preload = this.preload;
			if (!preload) {
				// first one
				this.preload = newTopPreload;
				return;
			}

			while (preload.node.compareDocumentPosition(newTopPreload.node) & Node.DOCUMENT_POSITION_PRECEDING) {
				preload = preload.previous;
				if (preload == null) {
					return;
				}
			}

			while (preload.node.compareDocumentPosition(newTopPreload.node) & Node.DOCUMENT_POSITION_FOLLOWING) {
				if (!preload.next) {
					break;
				}
				preload = preload.next;
			}
			// insert, newPreload before preload
			preload.previous.next = newTopPreload;
			newTopPreload.previous = preload.previous;
			var newBottomPreload = newTopPreload.next;
			newBottomPreload.next = preload;
			preload.previous = newBottomPreload;
		},

		refresh: function (options) {
			// summary:
			//		Refreshes the contents of the grid.
			// options: Object?
			//		Optional object, supporting the following parameters:
			//		* keepScrollPosition: like the keepScrollPosition instance property;
			//			specifying it in the options here will override the instance
			//			property's value for this specific refresh call only.

			var self = this,
				keep = (options && options.keepScrollPosition);

			// Fall back to instance property if option is not defined
			if (typeof keep === 'undefined') {
				keep = this.keepScrollPosition;
			}

			// Store scroll position to be restored after new total is received
			if (keep) {
				this._previousScrollPosition = this.getScrollPosition();
			}

			this.inherited(arguments);
			if (this._renderedCollection) {
				// render the query

				// renderQuery calls _trackError internally
				return this.renderQuery(function (queryOptions) {
					return self._renderedCollection.fetchRange({
						start: queryOptions.start,
						end: queryOptions.start + queryOptions.count
					});
				}).then(function () {
					self._emitRefreshComplete();
				});
			}
		},

		resize: function () {
			this.inherited(arguments);
			this._processScroll();
		},

		cleanup: function () {
			this.inherited(arguments);
			this.preload = null;
		},

		renderQueryResults: function (results) {
			var rows = this.inherited(arguments);
			var collection = this._getRenderedCollection(this.preload);

			if (collection && collection.releaseRange) {
				rows.then(function (resolvedRows) {
					if (resolvedRows[0] && !resolvedRows[0].parentNode.tagName) {
						// Release this range, since it was never actually rendered;
						// need to wait until totalLength promise resolves, since
						// Trackable only adds the range then to begin with
						results.totalLength.then(function () {
							collection.releaseRange(resolvedRows[0].rowIndex,
								resolvedRows[resolvedRows.length - 1].rowIndex + 1);
						});
					}
				});
			}

			return rows;
		},

		_getFirstRowSibling: function (container) {
			// summary:
			//		Returns the DOM node that a new row should be inserted before
			//		when there are no other rows in the current result set.
			//		In the case of OnDemandList, this will always be the last child
			//		of the container (which will be a trailing preload node).
			return container.lastChild;
		},

		_calcRowHeight: function (rowElement) {
			// summary:
			//		Calculate the height of a row. This is a method so it can be overriden for
			//		plugins that add connected elements to a row, like the tree

			var sibling = rowElement.nextSibling;

			// If a next row exists, compare the top of this row with the
			// next one (in case "rows" are actually rendering side-by-side).
			// If no next row exists, this is either the last or only row,
			// in which case we count its own height.
			if (sibling && !/\bdgrid-preload\b/.test(sibling.className)) {
				return sibling.offsetTop - rowElement.offsetTop;
			}

			return rowElement.offsetHeight;
		},

		_calcAverageRowHeight: function (rowElements) {
			// summary:
			//		Sets this.rowHeight based on the average from heights of the provided row elements.

			var count = rowElements.length;
			var height = 0;
			for (var i = 0; i < count; i++) {
				height += this._calcRowHeight(rowElements[i]);
			}
			// only update rowHeight if elements were passed and are in flow
			if (count && height) {
				return height / count;
			} else {
				return 0;
			}
		},

		_updatePreloadRowHeights: function () {
			var preload = this.preload;
			if (!preload) {
				return;
			}
			while (preload.previous) {
				preload = preload.previous;
			}
			while (preload) {
				if (!preload.rowHeight) {
					preload.rowHeight = this.rowHeight ||
						this._calcAverageRowHeight(preload.node.parentNode.querySelectorAll('.dgrid-row'));
					this._adjustPreloadHeight(preload);
				}
				preload = preload.next;
			}
		},

		lastScrollTop: 0,
		_processScroll: function (evt) {
			// summary:x
			//		Checks to make sure that everything in the viewable area has been
			//		downloaded, and triggering a request for the necessary data when needed.
			var preload = this.preload,
				rowHeight;

			this._updatePreloadRowHeights();
			rowHeight = preload && preload.rowHeight;
			if (!rowHeight) {
				return;
			}

			var grid = this,
				scrollNode = grid.bodyNode,
				// grab current visible top from event if provided, otherwise from node
				visibleTop = (evt && evt.scrollTop) || this.getScrollPosition().y,
				visibleBottom = scrollNode.offsetHeight + visibleTop,
				priorPreload, preloadNode,
				lastScrollTop = grid.lastScrollTop,
				requestBuffer = grid.bufferRows * rowHeight,
				searchBuffer = requestBuffer - rowHeight, // Avoid rounding causing multiple queries
				// References related to emitting dgrid-refresh-complete if applicable
				lastRows,
				preloadSearchNext = true;

			// XXX: I do not know why this happens.
			// munging the actual location of the viewport relative to the preload node by a few pixels in either
			// direction is necessary because at least WebKit on Windows seems to have an error that causes it to
			// not quite get the entire element being focused in the viewport during keyboard navigation,
			// which means it becomes impossible to load more data using keyboard navigation because there is
			// no more data to scroll to to trigger the fetch.
			// 1 is arbitrary and just gets it to work correctly with our current test cases; don’t wanna go
			// crazy and set it to a big number without understanding more about what is going on.
			// wondering if it has to do with border-box or something, but changing the border widths does not
			// seem to make it break more or less, so I do not know…
			var mungeAmount = 1;

			grid.lastScrollTop = visibleTop;

			function calculateDistanceOffset(preload, removeBelow) {
				if (removeBelow) {
					return preload.node.offsetTop - visibleBottom;
				} else {
					return visibleTop - (preload.node.offsetTop + preload.node.offsetHeight);
				}
			}

			function traverseToEndPreload(preload, removeBelow) {
				var direction = removeBelow ? 'next' : 'previous';
				var nextPreload;
				while ((nextPreload = preload[direction])) {
					preload = nextPreload;
				}
				return preload;
			}

			function removeDistantNodes(preload, removeBelow) {
				// we check to see the the nodes are "far off"

				var startingPreload = preload;
				preload = traverseToEndPreload(preload, removeBelow);

				var distanceOff = calculateDistanceOffset(preload, removeBelow);
				var farOffRemoval = grid.farOffRemoval;
				var preloadNode = preload.node;
				var domTraversal = removeBelow ? 'previousSibling' : 'nextSibling';
				var count = 0;
				var reclaimedHeight = 0;
				var firstRowIndex;
				var lastRowIndex;

				function findNextPreload() {
					var topPreloadWanted = !removeBelow;
					var newPreload = preload;
					while ((newPreload = newPreload[removeBelow ? 'previous' : 'next'])) {
						if (topPreloadWanted === newPreload.top) {
							return newPreload;
						}
					}
				}

				function isEmpty(aPreload) {
					return isPreloadNode(aPreload.top ? aPreload.node.nextSibling : aPreload.node.previousSibling);
				}

				function traversePreload() {
					var newPreload = findNextPreload();
					var node;

					if (newPreload && startingPreload !== newPreload && !isEmpty(newPreload)) {
						adjustPreloadStats();

						preload = newPreload;
						preloadNode = preload.node;
						distanceOff = calculateDistanceOffset(preload, removeBelow);
						node = traverseNode(preloadNode);
						resetRowIndexes(node);

						return node;
					}
				}

				function traverseNode(referenceNode) {
					// Preload node referenced was first moved to the appropriate end of the list and
					// now we are moving toward the viewable area.
					var refIsPreload = isPreloadNode(referenceNode);
					var node = referenceNode[domTraversal];
					var childNode;
					if (node) {
						if (!isRowNode(node)) {
							if (refIsPreload && isPreloadNode(node)) {
								node = null;
							} else {
								childNode = traversePreload();
								if (childNode) {
									node = childNode;
								} else {
									node = traverseNode(node);
								}
							}
						}
					}
					return node;
				}

				function adjustPreloadStats() {
					// adjust the preloadNode based on the reclaimed space
					preload.count += count;
					if (removeBelow) {
						preloadNode.rowIndex -= count;
					}
					grid._adjustPreloadHeight(preload);
					count = 0;

					grid._releaseRange(preload, removeBelow, firstRowIndex, lastRowIndex);
				}

				function resetRowIndexes(row) {
					firstRowIndex = row && row.rowIndex;
					lastRowIndex = undefined;
				}

				if (distanceOff > 2 * farOffRemoval) {
					// there is a preloadNode that is far off;
					// remove rows until we get to in the current viewport
					var row;
					var nextRow = traverseNode(preloadNode);
					resetRowIndexes(nextRow);

					while ((row = nextRow) && startingPreload !== preload) {
						var currentRowHeight = grid._calcRowHeight(row);
						if (reclaimedHeight + currentRowHeight + farOffRemoval > distanceOff || !isRowNode(row)) {
							// we have reclaimed enough rows or we have gone beyond grid rows
							nextRow = traversePreload();
							continue;
						}

						reclaimedHeight += currentRowHeight;
						count += row.count || 1;
						grid._pruneRow(row, removeBelow);

						if ('rowIndex' in row) {
							lastRowIndex = row.rowIndex;
						}
						nextRow = traverseNode(row);
					}

					adjustPreloadStats();
					grid._deleteNodeQueue();
				}
			}

			function traversePreload(preload, moveNext) {
				// Skip past preloads that are not currently connected
				do {
					preload = moveNext ? preload.next : preload.previous;
				} while (preload && !preload.node.offsetWidth);
				return preload;
			}

			while (preload && !preload.node.offsetWidth) {
				// skip past preloads that are not currently connected
				preload = preload.previous;
			}
			// there can be multiple preloadNodes (if they split, or multiple queries are created),
			//	so we can traverse them until we find whatever is in the current viewport, making
			//	sure we don't backtrack
			while (preload && preload !== priorPreload) {
				priorPreload = grid.preload;
				grid.preload = preload;
				preloadNode = preload.node;
				var preloadTop = preloadNode.offsetTop;

				if (visibleBottom + mungeAmount + searchBuffer < preloadTop) {
					// the preload is below the line of sight
					preload = traversePreload(preload, (preloadSearchNext = false));
				}
				else if (visibleTop - mungeAmount - searchBuffer > preloadTop + preloadNode.offsetHeight) {
					// the preload is above the line of sight
					preload = traversePreload(preload, (preloadSearchNext = true));
				}
				else {
					// the preload node is visible, or close to visible, better show it
					var offset = ((preloadNode.top ? visibleTop - requestBuffer :
							visibleBottom) - preloadTop) / preload.rowHeight;
					var count = (visibleBottom - visibleTop + 2 * requestBuffer) / preload.rowHeight;
					// utilize momentum for predictions
					var momentum = Math.max(
						Math.min((visibleTop - lastScrollTop) * preload.rowHeight, grid.maxRowsPerPage / 2),
						grid.maxRowsPerPage / -2);
					count += Math.min(Math.abs(momentum), 10);
					if (preloadNode.top) {
						// at the top, adjust from bottom to top
						offset -= count;
					}
					offset = Math.max(offset, 0);
					if (offset < 10 && offset > 0 && count + offset < grid.maxRowsPerPage) {
						// connect to the top of the preloadNode if possible to avoid excessive adjustments
						count += Math.max(0, offset);
						offset = 0;
					}
					count = Math.min(Math.max(count, grid.minRowsPerPage),
						grid.maxRowsPerPage, preload.count);

					if (count === 0) {
						preload = traversePreload(preload, preloadSearchNext);
						continue;
					}

					count = Math.ceil(count);
					offset = Math.min(Math.floor(offset), preload.count - count);

					var options = {};
					preload.count -= count;
					var beforeNode = preloadNode,
						keepScrollTo,
						queryRowsOverlap = grid.queryRowsOverlap,
						bottomPreload = !preload.top && preload;
					if (bottomPreload) {
						// add new rows below
						var previous = preload.previous;
						if (previous) {
							removeDistantNodes(preload);
							if (offset > 0 && isPreloadNode(preloadNode.previousSibling)) {
								// all of the nodes above were removed
								offset = Math.min(preload.count, offset);
								preload.previous.count += offset;
								grid._adjustPreloadHeight(preload.previous, true);
								preloadNode.rowIndex += offset;
								queryRowsOverlap = 0;
							}
							else {
								count += offset;
							}
							preload.count -= offset;
						}
						options.start = preloadNode.rowIndex - queryRowsOverlap;
						options.count = Math.min(count + queryRowsOverlap, grid.maxRowsPerPage);
						preloadNode.rowIndex = options.start + options.count;
					}
					else {
						// add new rows above
						if (preload.next) {
							// remove out of sight nodes first
							beforeNode = preloadNode.nextSibling;
							removeDistantNodes(preload, true);
							if (isPreloadNode(preloadNode.nextSibling)) {
								// all of the nodes were removed, can position wherever we want
								preload.next.count += preload.count - offset;
								preload.next.node.rowIndex = offset + count;
								grid._adjustPreloadHeight(preload.next);
								preload.count = offset;
								queryRowsOverlap = 0;
								beforeNode = preload.next.node;
							}
							else {
								keepScrollTo = true;
							}
						}
						options.start = preload.count;
						options.count = Math.min(count + queryRowsOverlap, grid.maxRowsPerPage);
						options.scrollingUp = true;
					}
					if (keepScrollTo && beforeNode && beforeNode.offsetWidth) {
						// Before adjusting the size of the preload node for the new rows yet to be loaded, remember
						// the current position of beforeNode so the scroll position can be adjusted after
						// the new rows are added.
						keepScrollTo = beforeNode.offsetTop;
					}
					grid._adjustPreloadHeight(preload);

					// use the query associated with the preload node to get the next "page"
					if ('level' in preload.query) {
						options.queryLevel = preload.query.level;
					}

					// Avoid spurious queries (ideally this should be unnecessary...)
					if (!('queryLevel' in options) && (options.start > grid._total || options.count < 0)) {
						continue;
					}

					// create a loading node as a placeholder while the data is loaded
					var loadingNode = domConstruct.create('div', {
						className: 'dgrid-loading',
						style: { height: count * preload.rowHeight + 'px' }
					}, beforeNode, 'before');
					domConstruct.create('div', {
						className: 'dgrid-' + (bottomPreload ? 'below' : 'above'),
						innerHTML: grid.loadingMessage
					}, loadingNode);
					loadingNode.count = count;

					// Query now to fill in these rows.
					grid._trackError(function () {
						// Use function to isolate the variables in case we make multiple requests
						// (which can happen if we need to render on both sides of an island of already-rendered rows)
						(function (loadingNode, below, keepScrollTo) {
							/* jshint maxlen: 122 */
							var rangeResults = preload.query(options);
							lastRows = grid.renderQueryResults(rangeResults, loadingNode, options).then(function (rows) {
								var gridRows = grid._rows;
								if (gridRows && !('queryLevel' in options) && rows.length) {
									// Update relevant observed range for top-level items
									if (below) {
										if (gridRows.max <= gridRows.min) {
											// All rows were removed; update start of rendered range as well
											gridRows.min = rows[0].rowIndex;
										}
										gridRows.max = rows[rows.length - 1].rowIndex;
									}
									else {
										if (gridRows.max <= gridRows.min) {
											// All rows were removed; update end of rendered range as well
											gridRows.max = rows[rows.length - 1].rowIndex;
										}
										gridRows.min = rows[0].rowIndex;
									}
								}

								// can remove the loading node now
								beforeNode = loadingNode.nextSibling;
								domConstruct.destroy(loadingNode);
								// beforeNode may have been removed if the query results loading node was removed
								// as a distant node before rendering
								if (keepScrollTo && beforeNode && beforeNode.offsetWidth) {
									// if the preload area above the nodes is approximated based on average
									// row height, we may need to adjust the scroll once they are filled in
									// so we don't "jump" in the scrolling position
									grid.scrollTo({
										y: grid.bodyNode.scrollTop + beforeNode.offsetTop - keepScrollTo
									});
								}

								rangeResults.totalLength.then(function (total) {
									if (!('queryLevel' in options)) {
										grid._total = total;
										if (grid._rows && grid._rows.max >= grid._total - 1) {
											grid._rows.max = Infinity;
										}
									}
									if (below) {
										// if it is below, we will use the total from the collection to update
										// the count of the last preload in case the total changes as
										// later pages are retrieved

										// recalculate the count
										below.count = total - below.node.rowIndex;
										// readjust the height
										grid._adjustPreloadHeight(below);
									}
								});

								// make sure we have covered the visible area
								grid._processScroll();
								return rows;
							}, function (e) {
								domConstruct.destroy(loadingNode);
								throw e;
							});
						})(loadingNode, bottomPreload, keepScrollTo);
					});

					preload = preload.previous;

				}
			}

			// return the promise from the last render
			return lastRows;
		},

		_adjustPreloadHeight: function (preload, noMax) {
			preload.node.style.height = this._calculatePreloadHeight(preload, noMax) + 'px';
		},

		_calculatePreloadHeight: function (preload, noMax) {
			return Math.min(preload.count * preload.rowHeight,
				noMax ? Infinity : this.maxEmptySpace);
		},

		_pruneRow: function (rowElement, removeBelow, options) {
			// Calling _pruneRow indicates the row is not being deleted permanantly but could be restored
			// as the grid scrolls.

			// Just do cleanup here, as we will do a more efficient node destruction will be done later.
			this.removeRow(rowElement, true, options);
			this._queueNodeForDeletion(rowElement);
		},

		_queueNodeForDeletion: function (node) {
			this._deleteQueue.push(node);
		},

		_deleteNodeQueue: function () {
			var trashBin = document.createElement('div');
			var toDelete = this._deleteQueue;
			for (var i = toDelete.length; i--;) {
				trashBin.appendChild(toDelete[i]);
			}
			this._deleteQueue = [];
			setTimeout(function () {
				// we can defer the destruction until later
				domConstruct.destroy(trashBin);
			}, 1);
		},

		_removePreloads: function (preloadNodes) {
			// summary:
			// 		Remove the preload objects from the linked list that correspond to the
			// 		supplied DOM nodes.
			if (!preloadNodes || !preloadNodes.length) {
				return;
			}

			var grid = this;
			var headPreload = this._getHeadPreload();
			preloadNodes.forEach(function (preloadNode) {
				var preload = grid._findPreload(preloadNode, headPreload);
				if (preload) {
					// Remove the found preload object from the linked list.
					if (preload.previous) {
						preload.previous.next = preload.next;
					}
					if (preload.next) {
						preload.next.previous = preload.previous;
					}
				}
			});
		},

		_getHeadPreload: function () {
			var headPreload = this.preload;
			if (headPreload) {
				while (headPreload.previous) {
					headPreload = headPreload.previous;
				}
			}
			return headPreload;
		},

		_findPreload: function (preloadNode, startingPreload) {
			if (!startingPreload) {
				startingPreload = this._getHeadPreload();
			}
			var preload = startingPreload;
			while (preload) {
				if (preload.node === preloadNode) {
					return preload;
				}
				preload = preload.next;
			}
		},

		_getRenderedCollection: function (/* preload */) {
			// This allows extensions to overload the collection retrieval mechanism.
			return this._renderedCollection;
		},

		_releaseRange: function (preload, removeBelow, firstRowIndex, lastRowIndex) {
			if (!preload) {
				return;
			}
			var level = preload.level;
			var renderedCollection = this._getRenderedCollection(preload);
			if (lastRowIndex != null) {
				if (renderedCollection.releaseRange &&
					typeof firstRowIndex === 'number' && typeof lastRowIndex === 'number') {
					// Note that currently child rows in Tree structures are never unrendered;
					// this logic will need to be revisited when that is addressed.

					// releaseRange is end-exclusive, and won't remove anything if start >= end.
					if (removeBelow) {
						renderedCollection.releaseRange(lastRowIndex, firstRowIndex + 1);
					}
					else {
						renderedCollection.releaseRange(firstRowIndex, lastRowIndex + 1);
					}

					if (this._rows && !level) {
						this._rows[removeBelow ? 'max' : 'min'] = lastRowIndex;
						if (this._rows.max >= this._total - 1) {
							this._rows.max = Infinity;
						}
					}
				}
			}
		}
	});
});
