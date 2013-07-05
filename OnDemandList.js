define(["./List", "./_StoreMixin", "dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "./util/misc", "put-selector/put"],
function(List, _StoreMixin, declare, lang, Deferred, listen, miscUtil, put){

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
	queryRowsOverlap: 1,
	
	// pagingMethod: String
	//		Method (from dgrid/util/misc) to use to either throttle or debounce
	//		requests.  Default is "debounce" which will cause the grid to wait until
	//		the user pauses scrolling before firing any requests; can be set to
	//		"throttleDelayed" instead to progressively request as the user scrolls,
	//		which generally incurs more overhead but might appear more responsive.
	pagingMethod: "debounce",
	
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
	
	rowHeight: 22,
	
	postCreate: function(){
		this.inherited(arguments);
		var self = this;
		// check visibility on scroll events
		listen(this.bodyNode, "scroll",
			miscUtil[this.pagingMethod](function(event){ self._processScroll(event); },
				null, this.pagingDelay));
	},
	
	renderQuery: function(query, preloadNode, options){
		// summary:
		//		Creates a preload node for rendering a query into, and executes the query
		//		for the first page of data. Subsequent data will be downloaded as it comes
		//		into view.
		var self = this,
			preload = {
				query: query,
				count: 0,
				node: preloadNode,
				options: options
			},
			priorPreload = this.preload,
			results;
		
		if(!preloadNode){
			// Initial query; set up top and bottom preload nodes
			var topPreload = {
				node: put(this.contentNode, "div.dgrid-preload", {
					rowIndex: 0
				}),
				count: 0,
				query: query,
				next: preload,
				options: options
			};
			topPreload.node.style.height = "0";
			preload.node = preloadNode = put(this.contentNode, "div.dgrid-preload");
			preload.previous = topPreload;
		}
		// this preload node is used to represent the area of the grid that hasn't been
		// downloaded yet
		preloadNode.rowIndex = this.minRowsPerPage;

		if(priorPreload){
			// the preload nodes (if there are multiple) are represented as a linked list, need to insert it
			if((preload.next = priorPreload.next) && 
					// check to make sure that the current scroll position is below this preload
					this.bodyNode.scrollTop >= priorPreload.node.offsetTop){ 
				// the prior preload is above/before in the linked list
				preload.previous = priorPreload;
			}else{
				// the prior preload is below/after in the linked list
				preload.next = priorPreload;
				preload.previous = priorPreload.previous;
			}
			// adjust the previous and next links so the linked list is proper
			preload.previous.next = preload;
			preload.next.previous = preload; 
		}else{
			this.preload = preload;
		}
		
		var loadingNode = put(preloadNode, "-div.dgrid-loading"),
			innerNode = put(loadingNode, "div.dgrid-below");
		innerNode.innerHTML = this.loadingMessage;

		function errback(err) {
			// Used as errback for when calls;
			// remove the loadingNode and re-throw if an error was passed
			put(loadingNode, "!");
			
			if(err){
				if(self._refreshDeferred){
					self._refreshDeferred.reject(err);
					delete self._refreshDeferred;
				}
				throw err;
			}
		}

		// Establish query options, mixing in our own.
		// (The getter returns a delegated object, so simply using mixin is safe.)
		options = lang.mixin(this.get("queryOptions"), options, 
			{start: 0, count: this.minRowsPerPage, query: query});
		
		// Protect the query within a _trackError call, but return the QueryResults
		this._trackError(function(){ return results = query(options); });
		
		if(typeof results === "undefined"){
			// Synchronous error occurred (but was caught by _trackError)
			errback();
			return;
		}
		
		// Render the result set
		Deferred.when(self.renderArray(results, preloadNode, options), function(trs){
			var total = typeof results.total === "undefined" ?
				results.length : results.total;
			return Deferred.when(total, function(total){
				// remove loading node
				put(loadingNode, "!");
				// now we need to adjust the height and total count based on the first result set
				var trCount = trs.length;
				if(total === 0){
					if(self.noDataNode){
						put(self.noDataNode, "!");
						delete self.noDataNode;
					}
					self.noDataNode = put(self.contentNode, "div.dgrid-no-data");
					self.noDataNode.innerHTML = self.noDataMessage;
				}
				var height = 0;
				for(var i = 0; i < trCount; i++){
					height += self._calcRowHeight(trs[i]);
				}
				// only update rowHeight if we actually got results and are visible
				if(trCount && height){ self.rowHeight = height / trCount; }
				
				total -= trCount;
				preload.count = total;
				preloadNode.rowIndex = trCount;
				if(total){
					preloadNode.style.height = Math.min(total * self.rowHeight, self.maxEmptySpace) + "px";
				}else{
					// if total is 0, IE quirks mode can't handle 0px height for some reason, I don't know why, but we are setting display: none for now
					preloadNode.style.display = "none";
				}
				
				if (self._previousScrollPosition) {
					// Restore position after a refresh operation w/ keepScrollPosition
					self.scrollTo(self._previousScrollPosition);
					delete self._previousScrollPosition;
				}
				
				// Redo scroll processing in case the query didn't fill the screen,
				// or in case scroll position was restored
				self._processScroll();
				
				// If _refreshDeferred is still defined after calling _processScroll,
				// resolve it now (_processScroll will remove it and resolve it itself
				// otherwise)
				if(self._refreshDeferred){
					self._refreshDeferred.resolve(results);
					delete self._refreshDeferred;
				}
				
				return trs;
			}, errback);
		}, errback);
		
		return results;
	},
	
	refresh: function(options){
		// summary:
		//		Refreshes the contents of the grid.
		// options: Object?
		//		Optional object, supporting the following parameters:
		//		* keepScrollPosition: like the keepScrollPosition instance property;
		//			specifying it in the options here will override the instance
		//			property's value for this specific refresh call only.
		
		var self = this,
			keep = (options && options.keepScrollPosition),
			dfd, results;
		
		// Fall back to instance property if option is not defined
		if(typeof keep === "undefined"){ keep = this.keepScrollPosition; }
		
		// Store scroll position to be restored after new total is received
		if(keep){ this._previousScrollPosition = this.getScrollPosition(); }
		
		this.inherited(arguments);
		if(this.store){
			// render the query
			dfd = this._refreshDeferred = new Deferred();
			
			// renderQuery calls _trackError internally
			results = self.renderQuery(function(queryOptions){
				return self.store.query(self.query, queryOptions);
			});
			if(typeof results === "undefined"){
				// Synchronous error occurred; reject the refresh promise.
				dfd.reject();
			}
			
			// Internally, _refreshDeferred will always be resolved with an object
			// containing `results` (QueryResults) and `rows` (the rendered rows);
			// externally the promise will resolve simply with the QueryResults, but
			// the event will be emitted with both under respective properties.
			return dfd.then(function(results){
				// Emit on a separate turn to enable event to be used consistently for
				// initial render, regardless of whether the backing store is async
				setTimeout(function() {
					listen.emit(self.domNode, "dgrid-refresh-complete", {
						bubbles: true,
						cancelable: false,
						grid: self,
						results: results // QueryResults object (may be a wrapped promise)
					});
				}, 0);
				
				// Delete the Deferred immediately so nothing tries to re-resolve
				delete self._refreshDeferred;
				
				// Resolve externally with just the QueryResults
				return results;
			}, function(err){
				delete self._refreshDeferred;
				throw err;
			});
		}
	},
	
	resize: function(){
		this.inherited(arguments);
		this._processScroll();
	},
	
	_calcRowHeight: function(rowElement){
		// summary:
		//		Calculate the height of a row. This is a method so it can be overriden for
		//		plugins that add connected elements to a row, like the tree
		
		var sibling = rowElement.previousSibling;
		return sibling && sibling.offsetTop != rowElement.offsetTop ?
			rowElement.offsetHeight : 0;
	},
	
	lastScrollTop: 0,
	_processScroll: function(evt){
		// summary:
		//		Checks to make sure that everything in the viewable area has been
		//		downloaded, and triggering a request for the necessary data when needed.
		var grid = this,
			scrollNode = grid.bodyNode,
			// grab current visible top from event if provided, otherwise from node
			visibleTop = (evt && evt.scrollTop) || this.getScrollPosition().y,
			visibleBottom = scrollNode.offsetHeight + visibleTop,
			priorPreload, preloadNode, preload = grid.preload,
			lastScrollTop = grid.lastScrollTop,
			requestBuffer = grid.bufferRows * grid.rowHeight,
			searchBuffer = requestBuffer - grid.rowHeight, // Avoid rounding causing multiple queries
			// References related to emitting dgrid-refresh-complete if applicable
			refreshDfd,
			lastResults,
			lastRows;
		
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

		function removeDistantNodes(preload, distanceOff, traversal, below){
			// we check to see the the nodes are "far off"
			var farOffRemoval = grid.farOffRemoval,
				preloadNode = preload.node;
			// by checking to see if it is the farOffRemoval distance away
			if(distanceOff > 2 * farOffRemoval){
				// ok, there is preloadNode that is far off, let's remove rows until we get to in the current viewpoint
				var row, nextRow = preloadNode[traversal];
				var reclaimedHeight = 0;
				var count = 0;
				var toDelete = [];
				while((row = nextRow)){
					var rowHeight = grid._calcRowHeight(row);
					if(reclaimedHeight + rowHeight + farOffRemoval > distanceOff || (nextRow.className.indexOf("dgrid-row") < 0 && nextRow.className.indexOf("dgrid-loading") < 0)){
						// we have reclaimed enough rows or we have gone beyond grid rows, let's call it good
						break;
					}
					var nextRow = row[traversal]; // have to do this before removing it
					var lastObserverIndex, currentObserverIndex = row.observerIndex;
					if(currentObserverIndex != lastObserverIndex && lastObserverIndex > -1){
						// we have gathered a whole page of observed rows, we can delete them now
						var observers = grid.observers; 
						var observer = observers[lastObserverIndex]; 
						observer && observer.cancel();
						observers[lastObserverIndex] = 0; // remove it so we don't call cancel twice
					}
					reclaimedHeight += rowHeight;
					count += row.count || 1;
					lastObserverIndex = currentObserverIndex;
					// we just do cleanup here, as we will do a more efficient node destruction in the setTimeout below
					grid.removeRow(row, true);
					toDelete.push(row);
				}
				// now adjust the preloadNode based on the reclaimed space
				preload.count += count;
				if(below){
					preloadNode.rowIndex -= count;
					adjustHeight(preload);
				}else{
					// if it is above, we can calculate the change in exact row changes, which we must do to not mess with the scrolling
					preloadNode.style.height = (preloadNode.offsetHeight + reclaimedHeight) + "px";
				}
				// we remove the elements after expanding the preload node so that the contraction doesn't alter the scroll position
				var trashBin = put("div", toDelete);
				setTimeout(function(){
					// we can defer the destruction until later
					put(trashBin, "!");
				},1);
			}
		}
		
		function adjustHeight(preload, noMax){
			preload.node.style.height = Math.min(preload.count * grid.rowHeight, noMax ? Infinity : grid.maxEmptySpace) + "px";
		}
		while(preload && !preload.node.offsetWidth){
			// skip past preloads that are not currently connected
			preload = preload.previous;
		}
		// there can be multiple preloadNodes (if they split, or multiple queries are created),
		//	so we can traverse them until we find whatever is in the current viewport, making
		//	sure we don't backtrack
		while(preload && preload != priorPreload){
			priorPreload = grid.preload;
			grid.preload = preload;
			preloadNode = preload.node;
			var preloadTop = preloadNode.offsetTop;
			var preloadHeight;
			
			if(visibleBottom + mungeAmount + searchBuffer < preloadTop){
				// the preload is below the line of sight
				do{
					preload = preload.previous;
				}while(preload && !preload.node.offsetWidth); // skip past preloads that are not currently connected
			}else if(visibleTop - mungeAmount - searchBuffer > (preloadTop + (preloadHeight = preloadNode.offsetHeight))){
				// the preload is above the line of sight
				do{
					preload = preload.next;
				}while(preload && !preload.node.offsetWidth);// skip past preloads that are not currently connected
			}else{
				// the preload node is visible, or close to visible, better show it
				var offset = ((preloadNode.rowIndex ? visibleTop - requestBuffer : visibleBottom) - preloadTop) / grid.rowHeight;
				var count = (visibleBottom - visibleTop + 2 * requestBuffer) / grid.rowHeight;
				// utilize momentum for predictions
				var momentum = Math.max(Math.min((visibleTop - lastScrollTop) * grid.rowHeight, grid.maxRowsPerPage/2), grid.maxRowsPerPage/-2);
				count += Math.min(Math.abs(momentum), 10);
				if(preloadNode.rowIndex == 0){
					// at the top, adjust from bottom to top
					offset -= count;
				}
				offset = Math.max(offset, 0);
				if(offset < 10 && offset > 0 && count + offset < grid.maxRowsPerPage){
					// connect to the top of the preloadNode if possible to avoid excessive adjustments
					count += Math.max(0, offset);
					offset = 0;
				}
				count = Math.min(Math.max(count, grid.minRowsPerPage),
									grid.maxRowsPerPage, preload.count);
				if(count == 0){
					return;
				}
				count = Math.ceil(count);
				offset = Math.min(Math.floor(offset), preload.count - count);
				var options = lang.mixin(grid.get("queryOptions"), preload.options);
				preload.count -= count;
				var beforeNode = preloadNode,
					keepScrollTo, queryRowsOverlap = grid.queryRowsOverlap,
					below = preloadNode.rowIndex > 0 && preload; 
				if(below){
					// add new rows below
					var previous = preload.previous;
					if(previous){
						removeDistantNodes(previous, visibleTop - (previous.node.offsetTop + previous.node.offsetHeight), 'nextSibling');
						if(offset > 0 && previous.node == preloadNode.previousSibling){
							// all of the nodes above were removed
							offset = Math.min(preload.count, offset);
							preload.previous.count += offset;
							adjustHeight(preload.previous, true);
							preloadNode.rowIndex += offset;
							queryRowsOverlap = 0;
						}else{
							count += offset;
						}
						preload.count -= offset;
					}
					options.start = preloadNode.rowIndex - queryRowsOverlap;
					preloadNode.rowIndex += count;
				}else{
					// add new rows above
					if(preload.next){
						// remove out of sight nodes first
						removeDistantNodes(preload.next, preload.next.node.offsetTop - visibleBottom, 'previousSibling', true);
						var beforeNode = preloadNode.nextSibling;
						if(beforeNode == preload.next.node){
							// all of the nodes were removed, can position wherever we want
							preload.next.count += preload.count - offset;
							preload.next.node.rowIndex = offset + count;
							adjustHeight(preload.next);
							preload.count = offset;
							queryRowsOverlap = 0;
						}else{
							keepScrollTo = true;
						}
						
					}
					options.start = preload.count;
				}
				options.count = Math.min(count + queryRowsOverlap, grid.maxRowsPerPage);
				if(keepScrollTo && beforeNode && beforeNode.offsetWidth){
					keepScrollTo = beforeNode.offsetTop;
				}

				adjustHeight(preload);
				// create a loading node as a placeholder while the data is loaded
				var loadingNode = put(beforeNode, "-div.dgrid-loading[style=height:" + count * grid.rowHeight + "px]"),
					innerNode = put(loadingNode, "div.dgrid-" + (below ? "below" : "above"));
				innerNode.innerHTML = grid.loadingMessage;
				loadingNode.count = count;
				// use the query associated with the preload node to get the next "page"
				options.query = preload.query;
				// Query now to fill in these rows.
				// Keep _trackError-wrapped results separate, since if results is a
				// promise, it will lose QueryResults functions when chained by `when`
				var results = preload.query(options),
					trackedResults = grid._trackError(function(){ return results; });
				
				if(trackedResults === undefined){
					// Sync query failed
					put(loadingNode, "!");
					return;
				}

				// Isolate the variables in case we make multiple requests
				// (which can happen if we need to render on both sides of an island of already-rendered rows)
				(function(loadingNode, scrollNode, below, keepScrollTo, results){
					lastRows = Deferred.when(grid.renderArray(results, loadingNode, options), function(rows){
						lastResults = results;
						
						// can remove the loading node now
						beforeNode = loadingNode.nextSibling;
						put(loadingNode, "!");
						if(keepScrollTo && beforeNode && beforeNode.offsetWidth){ // beforeNode may have been removed if the query results loading node was a removed as a distant node before rendering 
							// if the preload area above the nodes is approximated based on average
							// row height, we may need to adjust the scroll once they are filled in
							// so we don't "jump" in the scrolling position
							var pos = grid.getScrollPosition();
							grid.scrollTo({
								// Since we already had to query the scroll position,
								// include x to avoid TouchScroll querying it again on its end.
								x: pos.x,
								y: pos.y + beforeNode.offsetTop - keepScrollTo,
								// Don't kill momentum mid-scroll (for TouchScroll only).
								preserveMomentum: true
							});
						}
						if(below){
							// if it is below, we will use the total from the results to update
							// the count of the last preload in case the total changes as later pages are retrieved
							// (not uncommon when total counts are estimated for db perf reasons)
							Deferred.when(results.total || results.length, function(total){
								// recalculate the count
								below.count = total - below.node.rowIndex;
								// readjust the height
								adjustHeight(below);
							});
						}
						// make sure we have covered the visible area
						grid._processScroll();
						return rows;
					}, function (e) {
						put(loadingNode, "!");
						throw e;
					});
				}).call(this, loadingNode, scrollNode, below, keepScrollTo, results);
				preload = preload.previous;
			}
		}
		
		// After iterating, if additional requests have been made mid-refresh,
		// resolve the refresh promise based on the latest results obtained
		if (lastRows && (refreshDfd = this._refreshDeferred)) {
			delete this._refreshDeferred;
			Deferred.when(lastRows, function() {
				refreshDfd.resolve(lastResults);
			});
		}
	}
});

});
