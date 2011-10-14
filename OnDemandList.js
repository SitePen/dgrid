define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "put-selector/put", "./List"], function(declare, lang, Deferred, listen, put, List){
return declare([List], {
	create: function(params, srcNodeRef){
		this.inherited(arguments);
		this.dirty = {};
		var self = this;
		// check visibility on scroll events
		listen(this.bodyNode, "scroll", function(event){
			self.onscroll(event);
		});
	},
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
	
	constructor: function(){
		// Create empty query objects on each instance, not the prototype
		this.query || (this.query = {});
		this.queryOptions || (this.queryOptions = {});
	},
	
	setStore: function(store, query, queryOptions){
		// summary:
		//		Assigns a new store (and optionally query/queryOptions) to the list,
		//		and tells it to refresh.
		this.store = store;
		this.setQuery(query, queryOptions);
	},
	setQuery: function(query, queryOptions){
		// summary:
		//		Assigns a new query (and optionally queryOptions) to the list,
		//		and tells it to refresh.
		this.query = query !== undefined ? query : this.query;
		this.queryOptions = queryOptions || this.queryOptions;
		this.refresh();
	},
	
	renderQuery: function(query, preloadNode){
		// summary:
		//		Creates a preload node for rendering a query into, and executes the query
		//		for the first page of data. Subsequent data will be downloaded as it comes
		//		into view.
		if(!preloadNode){
			var topPreloadNode = put(this.contentNode, "div.dgrid-preload");
			topPreloadNode.preload = true;
			topPreloadNode.query = query;
			topPreloadNode.start = 0;
			topPreloadNode.count = 0;
			topPreloadNode.next =
				preloadNode = put(this.contentNode, "div.dgrid-preload");
			preloadNode.previous = topPreloadNode;
		}
		// this preload node is used to represent the area of the grid that hasn't been
		// downloaded yet
		preloadNode.preload = true;
		preloadNode.query = query;
		preloadNode.start = this.minRowsPerPage;
		preloadNode.count = 0;
		var priorPreload = this.preloadNode;
		if(priorPreload){
			// the preload nodes (if there are multiple) are represented as a linked list, need to insert it
			if((preloadNode.next = priorPreload.next)){
				var previous = preloadNode.next.previous;
			}
			preloadNode.previous = previous;
			preloadNode.next = preloadNode;
		}else{
			this.preloadNode = preloadNode;
		}
		var options = lang.delegate(this.queryOptions ? this.queryOptions : null, {start: 0, count: this.minRowsPerPage, query: query});
		// execute the query
		var results = query(options);
		var self = this;
		// render the result set
		return Deferred.when(this.renderArray(results, preloadNode, options), function(trs){
			return Deferred.when(results.total || results.length, function(total){
				// now we need to adjust the height and total count based on the first result set
				var trCount = trs.length;
				total = total || trCount;
				var height = 0;
				for(var i = 0; i < trCount; i++){
					height += trs[i].offsetHeight;
				}
				// only update rowHeight if we actually got results
				if(trCount){ self.rowHeight = height / trCount; }
				
				total -= trCount;
				if(!total && trCount){
					put(trs[trCount-1], ".dgrid-last-row");
				}
				preloadNode.count = total;
				preloadNode.start = trCount;
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
		}, console.error);
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
			this.renderQuery(function(queryOptions){
				if(self.sortOrder){
					queryOptions.sort = self.sortOrder;
				}
				return self.store.query(self.query, queryOptions);
			});
		}
	},
	lastScrollTop: 0,
	onscroll: function(){
		// summary:
		//		Checks to make sure that everything in the viewable area has been
		// 		downloaded, and triggering a request for the necessary data when needed.
		var scrollNode = this.bodyNode;
		var transform = this.contentNode.style.webkitTransform;
		var visibleTop = scrollNode.scrollTop + (transform ? -transform.match(/translate[\w]*\(.*?,(.*?)px/)[1] : 0);
		var visibleBottom = scrollNode.offsetHeight + visibleTop;
		var priorPreload, preloadNode = this.preloadNode;
		var lastScrollTop = this.lastScrollTop;
		this.lastScrollTop = visibleTop;


		function removeDistantNodes(grid, preloadNode, distanceOff, traversal, below){
			// we check to see the the nodes are "far off"
			var farOffRemoval = grid.farOffRemoval;
			// we check if it is twice as much as farOffRemoval and then prune down to farOffRemoval, we could make that configurable as well
			if(distanceOff > 2 * farOffRemoval){
				// ok, there is preloadNode that is far off, let's remove rows until we get to farOffRemoval
				var row, nextRow = preloadNode[traversal];
				var reclaimedHeight = 0;
				var count = 0;
				var toDelete = [];
				while(row = nextRow){ // intentional assignment
					var rowHeight = row.offsetHeight;
					if(reclaimedHeight + rowHeight + farOffRemoval > distanceOff || nextRow.className.indexOf("dgrid-row") < 0){
						// we have reclaimed enough rows or we have gone beyond grid rows, let's call it good
						break;
					}
					count++;
					reclaimedHeight += rowHeight;
					var nextRow = row[traversal]; // have to do this before removing it
					delete grid._rowIdToObject[row.id]; // clear out of the lookup
					toDelete.push(row);
				}
				// now adjust the preloadNode based on the reclaimed space
				preloadNode.count += count;
				if(below){
					preloadNode.start -= count;
					adjustHeight(grid, preloadNode);
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
		function adjustHeight(grid, preloadNode){
			var newHeight = preloadNode.count * grid.rowHeight;
			preloadNode.style.height = (preloadNode.start > 0 ? Math.min(newHeight, grid.maxEmptySpace) : newHeight) + "px";
		}
		// there can be multiple preloadNodes (if they split, or multiple queries are created),
		//	so we can traverse them until we find whatever is in the current viewport, making
		//	sure we don't backtrack
		while(preloadNode && preloadNode != priorPreload){
			priorPreload = this.preloadNode;
			this.preloadNode = preloadNode;
			var preloadTop = preloadNode.offsetTop;
			var preloadHeight;
			
			if(visibleBottom < preloadTop){
				// the preload is below the line of sight
				//removeDistantNodes(this, preloadTop - visibleBottom, 'previousSibling', true);
				preloadNode = preloadNode.previous;
			}else if(visibleTop > (preloadTop + (preloadHeight = preloadNode.offsetHeight))){
				// the preload is above the line of sight
				//removeDistantNodes(this, visibleTop - (preloadTop + preloadHeight), 'nextSibling');
				preloadNode = preloadNode.next;
			}else{
				// the preload node is visible, or close to visible, better show it
				var offset = ((preloadNode.start ? visibleTop : visibleBottom) - preloadTop) / this.rowHeight;
				var count = (visibleBottom - visibleTop) / this.rowHeight;
				// utilize momentum for predictions
				var momentum = Math.max(Math.min((visibleTop - lastScrollTop) * this.rowHeight, this.maxRowsPerPage/2), this.maxRowsPerPage/-2);
				count += Math.min(Math.abs(momentum), 10);
				if(preloadNode.start == 0){
					// at the top, adjust from bottom to top
					offset -= count;
				}
				offset = Math.max(offset, 0);
				if(offset < 10 && offset > 0 && count + offset < this.maxRowsPerPage){
					// connect to the top of the preloadNode if possible to avoid excessive adjustments
					count += offset;
					offset = 0;
				}
				count = Math.min(Math.max(count, this.minRowsPerPage),
									this.maxRowsPerPage, preloadNode.count);
				if(count == 0){
					return;
				}
				offset = Math.round(offset);
				count = Math.round(count);
				var options = this.queryOptions ? lang.delegate(this.queryOptions) : {};
				preloadNode.count -= count;
				var beforeNode = preloadNode;
				var keepScrollTo;
				if(preloadNode.start > 0){
					// add new rows below
					var previous = preloadNode.previous;
					if(previous){
						removeDistantNodes(this, previous, visibleTop - (previous.offsetTop + previous.offsetHeight), 'nextSibling');
						if(offset > 0 && previous == preloadNode.previousSibling){
							offset = Math.min(preloadNode.count, offset);
							preloadNode.previous.count += offset;
							preloadNode.count -= offset;
							preloadNode.start += offset;
						}
					}
					options.start = preloadNode.start;
					preloadNode.start += count;
				}else{
					// add new rows above
					if(preloadNode.next){
						// remove out of sight nodes first
						removeDistantNodes(this, preloadNode.next, preloadNode.next.offsetTop - visibleBottom, 'previousSibling', true);
						var beforeNode = preloadNode.nextSibling;
						if(beforeNode == preloadNode.next){
							// all of the nodes were removed, can position wherever we want
							preloadNode.next.count += preloadNode.count - offset;
							preloadNode.next.start = offset + count;
							preloadNode.count = offset;
						}else{
							keepScrollTo = true;
						}
						
					}
					options.start = preloadNode.count;
				}
				options.count = count;
				if(keepScrollTo){
					keepScrollTo = beforeNode.offsetTop;
				}
				
				adjustHeight(this, preloadNode);
				// create a loading node as a placeholder while the data is loaded
				var loadingNode = put(beforeNode, "-div.dgrid-loading[style=height:" + count * this.rowHeight + "px]");
				// use the query associated with the preload node to get the next "page"
				options.query = preloadNode.query;
				// query now to fill in these rows
				var results = preloadNode.query(options);
				Deferred.when(this.renderArray(results, loadingNode, options),function(){
						// can remove the loading node now
						beforeNode = loadingNode.nextSibling;
						loadingNode.parentNode.removeChild(loadingNode);
						if(keepScrollTo){
							// if the preload area above the nodes is approximated based on average
							// row height, we may need to adjust the scroll once they are filled in
							// so we don't "jump" in the scrolling position
							scrollNode.scrollTop += beforeNode.offsetTop - keepScrollTo;
						}
				}, console.error);
				preloadNode = preloadNode.previous;

			}
		}
	},
	getBeforePut: true,
	save: function(){
		var store = this.store;
		var puts = [];
		for(var id in this.dirty){
			var put = (function(dirty){
				return function(object){
					// copy all the dirty properties onto the original
					for(key in dirty){
						object[key] = dirty[key];
					}
					// put it
					store.put(object);
				};
			})(this.dirty[id]);
			puts.push(this.getBeforePut ?
				// retrieve the full object from the store
				Deferred.when(store.get(id), put) :
				// just use the cached object
				put(this.row(id).data));
		}
		this.dirty = {}; // clear it
		return puts;
	}
});

});