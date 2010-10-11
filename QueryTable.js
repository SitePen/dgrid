dojo.provide("dojox.table.QueryTable");
dojo.require("dojox.table.Table");

dojo.declare("dojox.table.QueryTable", dojox.table.Table, {
	create: function(params, srcNodeRef){
		this.inherited(arguments);
		var self = this;
		// check visibility on scroll events
		dojo.connect(this.scrollNode, "onscroll", function(){
			self.checkVisible();
		});
		//this.inherited(arguments);
		
	},
	lastScrollTop: 0,
	checkVisible: function(){
		// summary:
		//		Checks to make sure that everything in the viewable area has been 
		// 		downloaded, and triggering a request for the necessary data when needed.
		var scrollNode = this.scrollNode;
		var visibleTop = scrollNode.scrollTop;
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
					var second = dojo.clone(preloadNode);
				}else{
					preloadNode.start += count;
					preloadNode.count -= count;
					preloadNode.style.height = Math.min(preloadNode.count * this.rowHeight, this.maxEmptySpace);
				}
				// create a loading node as a placeholder while the data is loaded 
				var loadingNode = this.createNode("tr",{
					className: this.classes.loading,
					style: {
						height: count * this.rowHeight
					}
				});
				this.contentNode.insertBefore(loadingNode, preloadNode);
				// use the query associated with the preload node to get the next "page"
				options.query = preloadNode.query;
				var results = preloadNode.query(options);
				dojo.when(this.renderCollection(results, loadingNode, options),
					function(){
						// can remove the loading node now
						loadingNode.parentNode.removeChild(loadingNode);
					}, console.error);
			}
		}
	}	
});

