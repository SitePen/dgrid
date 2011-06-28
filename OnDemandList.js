define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "xstyle/create", "./List"], function(declare, dojo, Deferred, listen, create, List){
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
	queryOptions: {},
	query: {},
	store: null,
	minRowsPerPage: 25,
	maxRowsPerPage: 100,
	maxEmptySpace: 10000,
	rowHeight: 0,
	renderQuery: function(query, preloadNode){
		// summary:
		//		Creates a preload node for rendering a query into, and executes the query
		//		for the first page of data. Subsequent data will be downloaded as it comes
		//		into view.
		preloadNode = preloadNode || create(this.contentNode, ".preload");
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
		var options = {start: 0, count: this.minRowsPerPage, query: query};
		// execute the query
		var results = query(options);
		var self = this;
		// render the result set
		return Deferred.when(this.renderArray(results, preloadNode, options), function(trs){
			return Deferred.when(results.total || results.length, function(total){
				// now we need to adjust the height and total count based on the first result set
				var height = 0;
				for(var i = 0, l = trs.length; i < l; i++){
					height += trs[i].offsetHeight;
				} 
				self.rowHeight = height / l;
				total -= trs.length;
				preloadNode.count = total;
				preloadNode.start = trs.length;
				if(total){
					preloadNode.style.height = Math.min(total * self.rowHeight, self.maxEmptySpace) + "px";
				}else{
					// if total is 0, IE quirks mode can't handle 0px height for some reason, I don't know why, but we are setting display: none for now 
					preloadNode.style.display = "none"; 
				} 
				// can remove the loading node now
				return trs;
			});
		}, console.error);
	},
	sortOrder: null,
	sort: function(property, descending){
		// summary:
		//		Sort the content
		this.lastCollection = null;
		this.inherited(arguments);
	},
	refreshContent: function(){
		this.inherited(arguments);
		if(this.store){
			// render the query
			var self = this;
			this.renderQuery(function(queryOptions){
				queryOptions.sort = self.sortOrder;
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
		
		// there can be multiple preloadNodes (if they split, or multiple queries are created),
		//	so we can traverse them until we find whatever is in the current viewport, making
		//	sure we don't backtrack
		while(preloadNode && preloadNode != priorPreload){
			priorPreload = this.preloadNode; 
			this.preloadNode = preloadNode;
			var preloadTop = preloadNode.offsetTop;
			var preloadHeight;
			if(visibleBottom < preloadTop){
				// the preload is below the line of site
				preloadNode = preloadNode.previous;
			}else if(visibleTop > (preloadTop + (preloadHeight = preloadNode.offsetHeight))){
				// the preload is above the line of site
				preloadNode = preloadNode.next;
			}else{
				// the preload node is visible, or close to visible, better show it
				var offset = (visibleTop - preloadTop) / this.rowHeight;
				var count = (visibleBottom - visibleTop) / this.rowHeight;
				// utilize momentum for predictions
				var momentum = Math.max(Math.min((visibleTop - lastScrollTop) * this.rowHeight, this.maxRowsPerPage/2), this.maxRowsPerPage/-2);
				count += Math.abs(momentum);
				if(momentum < 0){ 
					offset += momentum;
				}
				offset = Math.max(offset, 0);
				if(offset < 10 && offset > 0 && count + offset < this.maxRowsPerPage){
					// connect to the top of the preloadNode if possible to avoid splitting
					count += offset;
					offset = 0;
				}
				// TODO: do this for the bottom too
				count = Math.max(count, this.minRowsPerPage);
				count = Math.min(count, this.maxRowsPerPage);
				count = Math.min(count, preloadNode.count);
				if(count == 0){
					return;
				}
				offset = Math.round(offset);
				count = Math.round(count);
				var options = this.queryOptions ? dojo.delegate(this.queryOptions) : {};
				options.start = preloadNode.start + offset;
				options.count = count;
				if(offset > 0 && offset + count < preloadNode.count){
					// TODO: need to do a split 
					var second = document.clone(preloadNode);
				}else{
					preloadNode.start += count;
					preloadNode.count -= count;
					preloadNode.style.height = Math.min(preloadNode.count * this.rowHeight, this.maxEmptySpace);
				}
				// create a loading node as a placeholder while the data is loaded 
				var loadingNode = create("tr.d-list-loading[style=height:" + count * this.rowHeight + "px]");
				this.contentNode.insertBefore(loadingNode, preloadNode);
				// use the query associated with the preload node to get the next "page"
				options.query = preloadNode.query;
				var results = preloadNode.query(options);
				Deferred.when(this.renderArray(results, loadingNode, options),
					function(){
						// can remove the loading node now
						loadingNode.parentNode.removeChild(loadingNode);
					}, console.error);
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
				Deferred.when(store.get(id), put):
				// just use the cached object
				put(this.row(id).data));
		}
		this.dirty = {}; // clear it
		return puts;
	}
});

});