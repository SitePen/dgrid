define(["../_StoreMixin", "dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/string", "dojo/_base/Deferred", "put-selector/put", "dojo/i18n!./nls/pagination", "xstyle/css!../css/extensions/Pagination.css"],
function(_StoreMixin, declare, lang, on, string, Deferred, put, i18n){
	return declare([_StoreMixin], {
		// summary:
		//		An extension for adding discrete pagination to a List or Grid.
		
		// rowsPerPage: Number
		//		Number of rows (items) to show on a given page.
		rowsPerPage: 10,
		
		showFooter: true,
		
		_currentPage: 1,
		_total: 0,
		
		buildRendering: function(){
			var grid = this;
			
			this.inherited(arguments);
			
			// add pagination to footer
			var paginationNode = this.paginationNode =
					put(this.footerNode, "div.dgrid-pagination"),
				statusNode = this.paginationStatusNode =
					put(paginationNode, "div.status"),
				navigationNode = this.paginationNavigationNode =
					put(paginationNode, "div.navigation");
			
			navigationNode.innerHTML = '<a href="#" class="first">&laquo;</a> ' +
				'<a href="#" class="previous">&lsaquo;</a> ' +
				'<a href="#" class="next">&rsaquo;</a> ' +
				'<a href="#" class="last">&raquo;</a>';
			
			on(navigationNode, "a:click", function(evt){
				evt.preventDefault();
				if(grid._isLoading){ return; }
				
				var curr = grid._currentPage,
					max = Math.ceil(grid._total / grid.rowsPerPage);
				
				// determine navigation target based on clicked link's class
				console.log(this.className, curr, max);
				if(this.className == "first"){
					grid.gotoPage(1);
				}else if(this.className == "previous"){
					if(curr > 1){ grid.gotoPage(curr - 1); }
				}else if(this.className == "next"){
					if(curr < max){ grid.gotoPage(curr + 1); }
				}else if(this.className == "last"){
					grid.gotoPage(max);
				}
			});
		},
		
		refresh: function(){
			if(!this.store){
				throw new Error("Pagination requires a store to operate.");
			}
			this.inherited(arguments);
			// reset to first page
			this.gotoPage(1);
		},
		
		gotoPage: function(page){
			// summary:
			//		Loads the given page.  Note that page numbers start at 1.
			
			console.log('goto:', page);
			var grid = this,
				count = this.rowsPerPage,
				start = (page - 1) * count,
				options = lang.delegate(this.queryOptions || {}, {
					start: start,
					count: count
				}),
				results,
				contentNode = this.contentNode,
				rows = this._rowIdToObject,
				substrLen = 5 + this.id.length, // trimmed from front of row IDs
				r, loadingNode;
			
			if(this.sortOrder){ options.sort = this.sortOrder; }
			
			// remove any currently-rendered rows
			for(r in rows){
				this.row(r.substr(substrLen)).remove();
			}
			this._rowIdToObject = {};
			contentNode.innerHTML = "";
			
			loadingNode = put(contentNode, "div.dgrid-loading");
			
			// set flag to deactivate pagination event handlers until loaded
			this._isLoading = true;
			
			// Run new query and pass it into renderArray
			// TODO: error handler (should also clear _isLoading)
			results = this.store.query(this.query, options);
			
			Deferred.when(results.total, function(total){
				// update status text based on now-current page and total
				grid.paginationStatusNode.innerHTML = string.substitute(i18n.status, {
					start: start + 1,
					end: start + count,
					total: total
				});
				grid._total = total;
				grid._currentPage = page;
			});
			
			return Deferred.when(this.renderArray(results, loadingNode, options), function(trs){
				put(loadingNode, "!");
				delete grid._isLoading;
				// reset scroll position now that new page is loaded
				grid.bodyNode.scrollTop = 0;
			});
		}
	});
});