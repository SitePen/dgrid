define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "put-selector/put", "./List"],
function(declare, lang, Deferred, listen, put, List){

function emitError(err){
	// called by _trackError in context of list/grid, if an error is encountered
	if(listen.emit(this.domNode, "dgrid-error", {error: err, cancelable: true, bubbles: true})){
		console.error(err);
	}
}

return declare([List], {
	queryOptions: null,
	query: null,
	store: null,
	minRowsPerPage: 25,
	maxRowsPerPage: 100,
	maxEmptySpace: 10000,
	// rows can be removed if they are this distance in pixels from the visible viewing area.
	// set this to infinity if you never want rows removed
	farOffRemoval: 1000,
	rowHeight: 22,
	// This indicates the number of rows to overlap queries. This helps keep continuous
	// data when underlying data changes (and thus pages don't exactly align)
	queryRowsOverlap: 1,
	// this indicates the delay to use before paging in more data on scroll. You may want
	// to increase this for low-bandwidth clients, or to reduce the number of requests against a server 
	pagingDelay: 10,
	// getBeforePut: boolean
	//		If true, a get request will be performed to the store before each put
	//		as a baseline when saving; otherwise, existing row data will be used.
	getBeforePut: true,
	// noDataMessage: String
	//		This is the message that is displayed when do data is available
	noDataMessage: "",
	// loadingMessage: String
	//		This is the message that is displayed when data is loading
	loadingMessage: "",
	
	constructor: function(){
		// Create empty objects on each instance, not the prototype
		this.query || (this.query = {});
		this.queryOptions || (this.queryOptions = {});
		this.dirty = {};
	},
	
	postCreate: function(){
		this.inherited(arguments);
		var self = this;
		// check visibility on scroll events
		listen(this.bodyNode, "scroll", function(event){
			self.onscroll(event);
		});
	},
	
	setStore: function(store, query, queryOptions){
		// summary:
		//		Assigns a new store (and optionally query/queryOptions) to the list,
		//		and tells it to refresh.
		this.store = store;
		this.dirty = {}; // discard dirty map, as it applied to a previous store
		this.setQuery(query, queryOptions);
	},
	setQuery: function(query, queryOptions){
		// summary:
		//		Assigns a new query (and optionally queryOptions) to the list,
		//		and tells it to refresh.
		
		var sort = queryOptions && queryOptions.sort;
		
		this.query = query !== undefined ? query : this.query;
		this.queryOptions = queryOptions || this.queryOptions;
		
		// If we have new sort criteria, pass them through sort
		// (which will update sortOrder and call refresh in itself).
		// Otherwise, just refresh.
		sort ? this.sort(sort) : this.refresh();
	},
	renderQuery: function(query, preloadNode){
		// summary:
		//		Creates a preload node for rendering a query into, and executes the query
		//		for the first page of data. Subsequent data will be downloaded as it comes
		//		into view.
		var preload = {
			query: query,
			count: 0,
			node: preloadNode
		};
		if(!preloadNode){
			var rootQuery = true;
			var topPreload = {
				node: put(this.contentNode, "div.dgrid-preload", {
					rowIndex: 0
				}),
				//topPreloadNode.preload = true;
				query: query,
				count: 0,
				next: preload
			};
			preload.node = preloadNode = put(this.contentNode, "div.dgrid-preload")
			preload.previous = topPreload;
		}
		// this preload node is used to represent the area of the grid that hasn't been
		// downloaded yet
		preloadNode.rowIndex = this.minRowsPerPage;

		var priorPreload = this.preload;
		if(priorPreload){
			// the preload nodes (if there are multiple) are represented as a linked list, need to insert it
			if((preload.next = priorPreload.next)){
				preload.previous = priorPreload;
			}else{
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
		var options = lang.delegate(this.queryOptions ? this.queryOptions : null, {start: 0, count: this.minRowsPerPage, query: query});
		// execute the query
		var results = query(options);
		var self = this;
		// render the result set
		Deferred.when(this.renderArray(results, preloadNode, options), function(trs){
			return Deferred.when(results.total || results.length, function(total){
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
				// only update rowHeight if we actually got results
				if(trCount){ self.rowHeight = height / trCount; }
				
				total -= trCount;
				preload.count = total;
				preloadNode.rowIndex = trCount;
				if(total){
					preloadNode.style.height = Math.min(total * self.rowHeight, self.maxEmptySpace) + "px";
				}else{
					// if total is 0, IE quirks mode can't handle 0px height for some reason, I don't know why, but we are setting display: none for now
					preloadNode.style.display = "none";
				}
				self.onscroll(); // recheck the scroll position in case the query didn't fill the screen
				// can remove the loading node now
				return trs;
			});
		});
		
		// return results so that callers can handle potential of async error
		return results;
	},
	
	sortOrder: null,
	sort: function(property, descending){
		// summary:
		//		Sort the content
		
		// prevent default storeless sort logic as long as we have a store
		if(this.store){ this.lastCollection = null; }
		this.inherited(arguments);
	},
	refresh: function(){
		this.inherited(arguments);
		if(this.store){
			// render the query
			var self = this;
			this._trackError(function(){
				return self.renderQuery(function(queryOptions){
					if(self.sortOrder){
						queryOptions.sort = self.sortOrder;
					}
					return self.store.query(self.query, queryOptions);
				});
			});
		}
	},
	
	insertRow: function(object, parent, beforeNode, i, options){
		var store = this.store,
			dirty = this.dirty,
			id = store && store.getIdentity(object),
			dirtyObj;
		
		if(id in dirty){ dirtyObj = dirty[id]; }
		if(dirtyObj){
			// restore dirty object as delegate on top of original object,
			// to provide protection for subsequent changes as well
			object = lang.delegate(object, dirtyObj);
		}
		return this.inherited(arguments);
	},
	getRowHeight: function(rowElement){
		// summary:
		//		Calculate the height of a row. This is a method so it can be overriden for
		//		plugins that add connected elements to a row, like the tree
		return rowElement.offsetHeight;
	},
	lastScrollTop: 0,
	onscroll: function(){
		// summary:
		//		Checks to make sure that everything in the viewable area has been
		// 		downloaded, and triggering a request for the necessary data when needed.
		if(!this._inPagingDelay){
			this._inPagingDelay = true;
			var grid = this;
			setTimeout(function(){
				grid._inPagingDelay = false;
				var scrollNode = grid.bodyNode;
				var transform = grid.contentNode.style.webkitTransform;
				var visibleTop = scrollNode.scrollTop + (transform ? -transform.match(/translate[\w]*\(.*?,(.*?)px/)[1] : 0);
				var visibleBottom = scrollNode.offsetHeight + visibleTop;
				var priorPreload, preloadNode, preload = grid.preload;
				var lastScrollTop = grid.lastScrollTop;
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
						while(row = nextRow){ // intentional assignment
							var rowHeight = grid.getRowHeight(row);
							if(reclaimedHeight + rowHeight + farOffRemoval > distanceOff || nextRow.className.indexOf("dgrid-row") < 0){
								// we have reclaimed enough rows or we have gone beyond grid rows, let's call it good
								break;
							}
							var nextRow = row[traversal]; // have to do this before removing it
							var lastObserverIndex, currentObserverIndex = row.observerIndex;
							if(currentObserverIndex != lastObserverIndex && lastObserverIndex > -1){
								// we have gathered a whole page of observed rows, we can delete them now
								var observers = grid.observers; 
								observers[lastObserverIndex].cancel();
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
						var trashBin = put("div");
						for(var i = 0; i < toDelete.length; i++){
							put(trashBin, toDelete[i]); // remove it from the DOM
						}
						setTimeout(function(){
							// we can defer the destruction until later
							put(trashBin, "!");
						},1);
					}
					
				}
				function adjustHeight(preload){
					var newHeight = preload.count * grid.rowHeight;
					preload.node.style.height = (preload.node.rowIndex > 0 ? Math.min(newHeight, grid.maxEmptySpace) : newHeight) + "px";
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
					
					if(visibleBottom < preloadTop){
						// the preload is below the line of sight
						preload = preload.previous;
					}else if(visibleTop > (preloadTop + (preloadHeight = preloadNode.offsetHeight))){
						// the preload is above the line of sight
						preload = preload.next;
					}else{
						// the preload node is visible, or close to visible, better show it
						var offset = ((preloadNode.rowIndex ? visibleTop : visibleBottom) - preloadTop) / grid.rowHeight;
						var count = (visibleBottom - visibleTop) / grid.rowHeight;
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
							count += offset;
							offset = 0;
						}
						count = Math.min(Math.max(count, grid.minRowsPerPage),
											grid.maxRowsPerPage, preload.count);
						if(count == 0){
							return;
						}
						offset = Math.round(offset);
						count = Math.round(count);
						var options = grid.queryOptions ? lang.delegate(grid.queryOptions) : {};
						preload.count -= count;
						var beforeNode = preloadNode,
							keepScrollTo, queryRowsOverlap = grid.queryRowsOverlap,
							below = preloadNode.rowIndex > 0; 
						if(below){
							// add new rows below
							var previous = preload.previous;
							if(previous){
								removeDistantNodes(previous, visibleTop - (previous.node.offsetTop + previous.node.offsetHeight), 'nextSibling');
								if(offset > 0 && previous.node == preloadNode.previousSibling){
									// all of the nodes above were removed
									offset = Math.min(preload.count, offset);
									preload.previous.count += offset;
									adjustHeight(preload.previous);
									preload.count -= offset;
									preloadNode.rowIndex += offset;
									queryRowsOverlap = 0;
								}
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
									preload.count = offset;
									queryRowsOverlap = 0;
								}else{
									keepScrollTo = true;
								}
								
							}
							options.start = preload.count;
						}
						options.count = count + queryRowsOverlap;
						if(keepScrollTo){
							keepScrollTo = beforeNode.offsetTop;
						}
						
						adjustHeight(preload);
						// create a loading node as a placeholder while the data is loaded
						var loadingNode = put(beforeNode, "-div.dgrid-loading[style=height:" + count * grid.rowHeight + "px]");
						put(loadingNode, "div.dgrid-" + (below ? "below" : "above"), grid.loadingMessage);
						// use the query associated with the preload node to get the next "page"
						options.query = preload.query;
						
						// Query now to fill in these rows.
						// Keep _trackError-wrapped results separate, since if results is a
						// promise, it will lose QueryResults functions when chained by `when`
						var results = preload.query(options),
							trackedResults = grid._trackError(function(){ return results; });
						
						if(trackedResults === undefined){ return; } // sync query failed
						
						Deferred.when(grid.renderArray(results, loadingNode, options), function(){
								// can remove the loading node now
								beforeNode = loadingNode.nextSibling;
								put(loadingNode, "!");
								if(keepScrollTo){
									// if the preload area above the nodes is approximated based on average
									// row height, we may need to adjust the scroll once they are filled in
									// so we don't "jump" in the scrolling position
									scrollNode.scrollTop += beforeNode.offsetTop - keepScrollTo;
								}
						});
						preload = preload.previous;
		
					}
				}
			}, this.pagingDelay);
		}
	},
	
	setDirty: function(id, field, value){
		// summary:
		//		Updates dirty data of a field for the item with the specified ID.
		var dirty = this.dirty,
			dirtyObj = dirty[id];
		
		if(!dirtyObj){
			dirtyObj = dirty[id] = {};
		}
		dirtyObj[field] = value;
	},
	
	save: function() {
		// Keep track of the store and puts
		var self = this,
			store = this.store,
			dirty = this.dirty,
			dfd = new Deferred(), promise = dfd.promise,
			getFunc = function(id){
				// returns a function to pass as a step in the promise chain,
				// with the id variable closured
				return self.getBeforePut ?
					function(){ return store.get(id); } :
					function(){ return self.row(id).data; };
			};
		
		// function called within loop to generate a function for putting an item
		function putter(id, dirtyObj) {
			// Return a function handler
			return function(object) {
				var key;
				// Copy dirty props to the original
				for(key in dirtyObj){ object[key] = dirtyObj[key]; }
				// Put it in the store, returning the result/promise
				return Deferred.when(store.put(object), function() {
					// Delete the item now that it's been confirmed updated
					delete dirty[id];
				});
			};
		}
		
		// For every dirty item, grab the ID
		for(var id in this.dirty) {
			// Create put function to handle the saving of the the item
			var put = putter(id, dirty[id]);
			
			// Add this item onto the promise chain,
			// getting the item from the store first if desired.
			promise = promise.then(getFunc(id)).then(put);
		}
		
		// Kick off and return the promise representing all applicable get/put ops.
		// If the success callback is fired, all operations succeeded; otherwise,
		// save will stop at the first error it encounters.
		dfd.resolve();
		return promise;
	},
	
	_trackError: function(func){
		// summary:
		//		Utility function to handle emitting of error events.
		// func: Function|String
		//		A function which performs some store operation, or a String identifying
		//		a function to be invoked (sans arguments) hitched against the instance.
		//		If sync, it can return a value, but may throw an error on failure.
		//		If async, it should return a promise, which would fire the error
		//		callback on failure.
		// tags:
		//		protected
		
		var result;
		
		if(typeof func == "string"){ func = lang.hitch(this, func); }
		
		try{
			result = func();
		}catch(err){
			// report sync error
			emitError.call(this, err);
		}
		
		// wrap in when call to handle reporting of potential async error
		return Deferred.when(result, null, lang.hitch(this, emitError));
	}
});

});
