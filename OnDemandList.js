define(["./List", "./_StoreMixin", "dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "./util/misc", "put-selector/put"],
function(List, _StoreMixin, declare, lang, Deferred, listen, miscUtil, put){

return declare([List, _StoreMixin], {
	// minRowsPerPage: Integer
	//		The minimum number of rows to request at one time.
	minRowsPerPage: 25,
	// maxRowsPerPage: Integer
	//		The maximum number of rows to request at one time.
	maxRowsPerPage: 100,
	// bufferRows: Integer
	//	  The number of rows to keep ready on each side of the viewport area so that the user can
	//	  perform local scrolling without seeing the grid being built. Increasing this number can
	//	  improve perceived performance when the data is being retrieved over a slow network.
	bufferRows: 10,
	// farOffRemoval: Integer
	//		Defines the minimum distance (in pixels) from the visible viewport area
	//		rows must be in order to be removed.  Setting to Infinity causes rows
	//		to never be removed.
	farOffRemoval: 1000,

	rowHeight: 22,
	
	// queryRowsOverlap: Integer
	//		Indicates the number of rows to overlap queries. This helps keep
	//		continuous data when underlying data changes (and thus pages don't
	//		exactly align)
	queryRowsOverlap: 1,
	
	// pagingDelay: Integer
	//		Indicates the delay (in milliseconds) to wait before paging in more data
	//		on scroll. This can be increased for low-bandwidth clients, or to
	//		reduce the number of requests against a server 
	pagingDelay: miscUtil.defaultDelay,

	postCreate: function(){
		this.inherited(arguments);
		var self = this;
		// check visibility on scroll events
		listen(this.bodyNode, "scroll",
			miscUtil.throttleDelayed(function(event){ self._processScroll(event); },
				null, this.pagingDelay));
	},
	
	renderQuery: function(query, preloadNode){
		// summary:
		//		Creates a preload node for rendering a query into, and executes the query
		//		for the first page of data. Subsequent data will be downloaded as it comes
		//		into view.
		var preload = {
			query: query,
			node: preloadNode
		};
		if(!preloadNode){
			var rootQuery = true;
			var topPreload = {
				node: put(this.contentNode, "div.dgrid-preload", {
					rowIndex: 0,
					rowCount: 0
				}),
				//topPreloadNode.preload = true;
				query: query,
				next: preload
			};
			preload.node = preloadNode = put(this.contentNode, "div.dgrid-preload", {
			rowCount: 0
		 });
			preload.previous = topPreload;
		}
		// this preload node is used to represent an area of the grid that hasn't been
		// downloaded yet
		preloadNode.rowIndex = this.minRowsPerPage;

		var priorPreload = this.preload;
		if(priorPreload){
			// the preload nodes are represented as a linked list, need to insert it
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
		var loadingNode = put(preloadNode, "-div.dgrid-loading");
		put(loadingNode, "div.dgrid-below", this.loadingMessage);
		// Establish query options, mixing in our own.
		// (The getter returns a delegated object, so simply using mixin is safe.)
		var options = lang.mixin(this.get("queryOptions"),
			{start: 0, count: this.minRowsPerPage, query: query});
		// execute the query
		var results = query(options);
		var self = this;
		// render the result set
		Deferred.when(this.renderArray(results, preloadNode, options), function(trs){
			return Deferred.when(results.total || results.length, function(total){
				// Check that the grid hasn't been refreshed in the meantime
				if (!loadingNode.parentNode){
					return;
				}
				// remove loading node
				put(loadingNode, "!");
				// now we need to adjust the height and total count based on the first result set
				var trCount = trs.length;
				total = total || trCount;
				if(!total){
					put(self.contentNode, "div.dgrid-no-data").innerHTML = self.noDataMessage;
				}
				var height = 0;
				for(var i = 0; i < trCount; i++){
					height += trs[i].offsetHeight;
				}
				// only update rowHeight if we actually got results and are visible
				if(trCount && height){ self.rowHeight = height / trCount; }
				
				total -= trCount;
				preloadNode.rowCount = total;
				preloadNode.rowIndex = trCount;
				// if total is 0, IE quirks mode can't handle 0px height for some reason, I don't know why, but we are setting display: none for now
				if(total){
					preloadNode.style.height = total * self.rowHeight + "px";
				}
				preloadNode.style.display = total ? "" : "none";
				self._processScroll(); // recheck the scroll position in case the query didn't fill the screen
				// can remove the loading node now
				return trs;
			});
		});

		// return results so that callers can handle potential of async error
		return results;
	},
	
	refresh: function(){
		this.inherited(arguments);
		if(this.store){
			// render the query
			var self = this;
			this._trackError(function(){
				return self.renderQuery(function(queryOptions){
					return self.store.query(self.query, queryOptions);
				});
			});
		}
	},
	
	_calcRowHeight: function(rowElement){
		// summary:
		//		Calculate the height of a row. This is a method so it can be overriden for
		//		plugins that add connected elements to a row, like the tree
		return rowElement.offsetHeight;
	},
	
	lastScrollTop: 0,
	_processScroll: function(){
		// summary:
		//		Checks to make sure that everything in the viewable area has been
		//		downloaded, and triggering a request for the necessary data when needed.
		var grid = this,
			scrollNode = grid.bodyNode,
			transform = grid.contentNode.style.webkitTransform,
			visibleTop = scrollNode.scrollTop + (transform ? -transform.match(/translate[\w]*\(.*?,(.*?)px/)[1] : 0),
			visibleBottom = scrollNode.offsetHeight + visibleTop,
			priorPreload, preloadNode,
			queryRowsOverlap = grid.queryRowsOverlap,
			lastScrollTop = grid.lastScrollTop,
			requestBuffer = grid.bufferRows * grid.rowHeight,
			searchBuffer = requestBuffer - grid.rowHeight, // Avoid rounding causing multiple queries
			farOffRemoval = grid.farOffRemoval;
		
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

		// Scans the whole list, removing nodes that are far from the viewport
		function removeDistantNodes(){
			var preload = grid.preload,
				trashBin = put("div");
			while (preload.previous){
				preload = preload.previous;
			}
			while (preload){
				// This code will not remove blocks of rows that are not adjacent to a preload node,
				// however currently the only situation this happens is when they are between two loading nodes.
				// In this case they will be removed on the first scroll after one of the loading nodes' queries
				// has been resolved.
				removePreloadDistantNodes(preload, "previousSibling", trashBin);
				removePreloadDistantNodes(preload, "nextSibling", trashBin);
				preload = preload.next;
			}
			setTimeout(function(){
				// we can defer the destruction until later
				put(trashBin, "!");
			},1);
		}

		// Expands the preload in the specified traversal direction ("previousSibling"/"nextSibling")
		// consuming rows that are further than farOffRemoval from the viewport. For efficiency it
		// it returns an array of nodes to be deleted rather than deleting them itself.
		function removePreloadDistantNodes(preload, traversal, trashBin){
			var toDelete = [],
				reclaimedHeight = 0,
				count = 0,
				preloadNode = preload.node,
				row, nextRow = preloadNode[traversal],
				preloadTraversal = traversal.replace("Sibling", ""),
				// Don't merge preloads if there are fewer than 3; there must be one on each end of the list
				canMergePrenodes = preload.previous && preload.previous.previous ||
					preload.next && preload.previous || preload.next && preload.next.next;
			while((row = nextRow)){
				var rowHeight = grid._calcRowHeight(row);
				if (row.offsetTop + rowHeight > visibleTop - farOffRemoval && row.offsetTop < visibleBottom + farOffRemoval ||
						!miscUtil.isDataRow(nextRow)){
					// We've reached a non-data row or it's within farOffRemoval of the viewport
					break;
				}
				nextRow = row[traversal]; // have to do this before removing it
				var lastObserverIndex, currentObserverIndex = row.observerIndex;
				if(currentObserverIndex != lastObserverIndex && lastObserverIndex > -1){
					// we have gathered a whole page of observed rows, we can delete them now
					var observers = grid.observers;
					var observer = observers[lastObserverIndex];
					observer && observer.cancel();
					observers[lastObserverIndex] = 0; // remove it so we don't call cancel twice
				}
				reclaimedHeight += rowHeight;
				count++;
				lastObserverIndex = currentObserverIndex;
				// we just do cleanup here, as we will do a more efficient node destruction in the setTimeout below
				grid.removeRow(row, true);
				delete grid._rowIdToObject[row.id]; // clear out of the lookup
				toDelete.push(row);
			}
			preloadNode.rowCount += count;
			if (traversal == "previousSibling"){
				preloadNode.rowIndex -= count;
			}
			// We've reached another preload node so we can merge them
			if (canMergePrenodes && preload[preloadTraversal] && preload[preloadTraversal].node == nextRow){
				var preloadToDelete = preload[preloadTraversal];
				reclaimedHeight += preloadToDelete.node.offsetHeight;
				preloadNode.rowCount += preloadToDelete.node.rowCount;
				if (traversal == "previousSibling")
					preloadNode.rowIndex = preloadToDelete.node.rowIndex;
				toDelete.push(preloadToDelete.node);
				if (preloadToDelete.next){
					preloadToDelete.next.previous = preloadToDelete.previous;
				}
				if (preloadToDelete.previous){
					preloadToDelete.previous.next = preloadToDelete.next;
				}
				if (grid.preload == preloadToDelete){
					grid.preload = preload;
				}
			}
			// Expand based on actual reclaimed height, not average row height
			preloadNode.style.height = (preloadNode.offsetHeight + reclaimedHeight) + "px";
			// IE6 workaround - sometimes setting a height of 0 doesn't actually make it 0
			preloadNode.style.display = preloadNode.rowCount ? "" : "none";
			// we remove the elements after expanding the preload node so that the contraction doesn't alter the scroll position
			for(var i = 0; i < toDelete.length; i++){
				put(trashBin, toDelete[i]); // remove it from the DOM
			}
		}
		
		function adjustHeight(preload){
			var height = preload.node.rowCount * grid.rowHeight;
			preload.node.style.height = height + "px";
			preload.node.style.display = height ? "" : "none"; // IE6 workaround
		}
		removeDistantNodes();
		// Must be assigned after calling removeDistantNodes() in case grid.preload gets changed
		var preload = grid.preload;
		// there are multiple preloadNodes (if they split, or multiple queries are created),
		//	so we can traverse them until we find whatever is in the current viewport, making
		//	sure we don't backtrack
		while(preload && preload != priorPreload){
			priorPreload = grid.preload;
			grid.preload = preload;
			preloadNode = preload.node;
			var preloadTop = preloadNode.offsetTop;
			var preloadHeight;
			// IE doesn't compute offsetTop for nodes that have display: none
			if (preloadTop == 0 && preloadNode.style.display == "none" && preloadNode.previousSibling){
				preloadTop = preloadNode.previousSibling.offsetTop + preloadNode.previousSibling.offsetHeight;
			}

			// Clean up empty preloads
			if(!preload.node.rowCount && preload.next && preload.previous){
				put(preloadNode, "!");
				preload.next.previous = preload.previous;
				preload.previous.next = preload.next;

				preload = priorPreload == preload.next ? preload.previous : preload.next;
				continue;
			}
			
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
				var offset = (visibleTop - preloadTop - requestBuffer) / grid.rowHeight;
				var count = (visibleBottom - visibleTop + 2 * requestBuffer) / grid.rowHeight;
				// utilize momentum for predictions
				var momentum = Math.max(Math.min((visibleTop - lastScrollTop) * grid.rowHeight, grid.maxRowsPerPage/2), grid.maxRowsPerPage/-2);
				count += Math.min(Math.abs(momentum), 10);
				offset = Math.max(offset, 0);
				if(offset < 10 && offset > 0 && count + offset < grid.maxRowsPerPage){
					// connect to the top of the preloadNode if possible to avoid excessive adjustments
					count += Math.max(0, offset);
					offset = 0;
				}
				count = Math.min(Math.max(count, grid.minRowsPerPage),
									grid.maxRowsPerPage, preload.node.rowCount);
				if(count == 0){
					return;
				}
				count = Math.ceil(count);
				offset = Math.min(Math.floor(offset), preload.node.rowCount - count);
				var options = grid.get("queryOptions");
				preload.node.rowCount -= count;
				var beforeNode = preloadNode;
				// If we're not at the top of the preload node,
				// split it at the point we want to put the rows
				if (offset){
					var newPreload = {
						node: put(preloadNode, "+div.dgrid-preload", {
							rowIndex: preloadNode.rowIndex + offset,
							rowCount: preloadNode.rowCount - offset
						}),
						next: preload.next,
						previous: preload,
						query: preload.query
					};
					preloadNode.rowCount = newPreload.node.rowIndex - preloadNode.rowIndex;
					preload.next = newPreload;
					if (newPreload.next)
						newPreload.next.previous = newPreload;

					adjustHeight(preload);
					preload = newPreload;
					beforeNode = preloadNode = preload.node;
				}
				options.start = Math.max(0, preloadNode.rowIndex - queryRowsOverlap);
				options.count = count + queryRowsOverlap;
				preloadNode.rowIndex += count;

				adjustHeight(preload);
				// create a loading node as a placeholder while the data is loaded
				var loadingNode = put(beforeNode, "-div.dgrid-loading[style=height:" + count * grid.rowHeight + "px]", {
					rowCount: count,
					rowIndex: preloadNode.rowIndex - count
				});
				put(loadingNode, "div.dgrid-below", grid.loadingMessage);
				// use the query associated with the preload node to get the next "page"
				options.query = preload.query;
				// Query now to fill in these rows.
				// Keep _trackError-wrapped results separate, since if results is a
				// promise, it will lose QueryResults functions when chained by `when`
				var results = preload.query(options),
					trackedResults = grid._trackError(function(){ return results; });
				
				if(trackedResults === undefined){ return; } // sync query failed

				// Isolate the variables in case we make multiple requests
				// (which can happen if we need to render on both sides of an island of already-rendered rows)
				(function(loadingNode, results){
					// Set rowCount to 0 so we won't interfere with renderArray's reindexing of subsequent rows
					Deferred.when(results, function() { loadingNode.rowCount = 0; });
					Deferred.when(grid.renderArray(results, loadingNode, options), function(rows){
						// Check that the grid hasn't been refreshed in the meantime
						if (!loadingNode.parentNode){
							return;
						}
						// can remove the loading node now
						put(loadingNode, "!");
						// Use the total from the results to update the count of the last preload in case the total
						// changes as later pages are retrieved (not uncommon when total counts are estimated for
						// db perf reasons)
						Deferred.when(results.total || results.length, function(total){
							// Check that the grid hasn't been refreshed in the meantime
							if (!rows[0] || !rows[0].parentNode){
								return;
							}
							// Must use grid.preload in case the one we were using has been deleted.
							var last = grid.preload;
							while (last.next){
								last = last.next;
							}
							// readjust the height
							last.node.rowCount = Math.max(0, total - last.node.rowIndex);
							adjustHeight(last);
						});
					});
				}).call(this, loadingNode, results);
				preload = preload.previous;
			}
		}
	}
});

});
