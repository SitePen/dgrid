define(["../_StoreMixin", "dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/string", "dojo/_base/Deferred", "put-selector/put", "dojo/i18n!./nls/pagination", "xstyle/css!../css/extensions/Pagination.css"],
function(_StoreMixin, declare, lang, on, string, Deferred, put, i18n){
	return declare([_StoreMixin], {
		// summary:
		//		An extension for adding discrete pagination to a List or Grid.
		
		// rowsPerPage: Number
		//		Number of rows (items) to show on a given page.
		rowsPerPage: 10,
		
		showFooter: true,
		// pagingTextBox: Boolean
		// 		Indicate whether or not to show a textbox for paging
		pagingTextBox: false,
		_currentPage: 1,
		_total: 0,
		// pagingTextBox: Number|Boolean
		// 		The number of page links to show (also depends on proximity to start and end)
		//		Set to false to disable the page links
		pagingLinks: 10, 
		
		buildRendering: function(){
			var grid = this;
			
			this.inherited(arguments);
			
			// add pagination to footer
			var paginationNode = this.paginationNode =
					put(this.footerNode, "div.dgrid-pagination"),
				statusNode = this.paginationStatusNode =
					put(paginationNode, "div.dgrid-status"),
				navigationNode = this.paginationNavigationNode =
					put(paginationNode, "div.dgrid-navigation");
			
			on(navigationNode, "a:click", function(evt){
				evt.preventDefault();
				if(grid._isLoading){ return; }
				
				var curr = grid._currentPage,
					max = Math.ceil(grid._total / grid.rowsPerPage);
				
				// determine navigation target based on clicked link's class
				if(this.className == "dgrid-page-link"){
					grid.gotoPage(+this.innerHTML); // the innerHTML has the page number
				}
				if(this.className == "dgrid-first"){
					grid.gotoPage(1);
				}else if(this.className == "dgrid-previous"){
					if(curr > 1){ grid.gotoPage(curr - 1); }
				}else if(this.className == "dgrid-next"){
					if(curr < max){ grid.gotoPage(curr + 1); }
				}else if(this.className == "dgrid-last"){
					grid.gotoPage(max);
				}
			});
		},
		updateNavigation: function(currentPage){
			// summary:
			//		Update status and navigation controls based on total count from query
			function pageLink(page){
				put(navigationNode, (page == currentPage ? 'span' : 'a[href=#]') + '.dgrid-page-link', page);
			}
			var navigationNode = this.paginationNavigationNode,
				currentPage = this._currentPage,
				pagingLinks = this.pagingLinks,
				end = this._total / this.rowsPerPage;
				
			navigationNode.innerHTML = "";
			// create a previous link
			put(navigationNode,  (currentPage <= 1 ? 'span' : 'a[href=#]') + '.dgrid-previous', '‹'); // « ‹ › »
			if(pagingLinks){
				// always include the first page (back to the beginning)
				pageLink(1);
				var start = Math.floor(currentPage - pagingLinks / 2);
				if(start > 2) {
					// visual indication of skipped page links
					put(navigationNode, 'span.dgrid-page-skip', '...');
				}else{
					start = 2;
				}
				// now iterate through all the page links we should show
				for(var i = start; i < Math.min(start + pagingLinks, end + 1); i++){
					pageLink(i);
				}
			}
			if(this.pagingTextBox){
				// include a paging text box
				var grid = this;
				on(put(navigationNode, 'input.dgrid-page-input[type=text][value=$]', currentPage), "change", function(){
					grid.gotoPage(+this.value);
				});
			}
			put(navigationNode, (end <= currentPage ? 'span' : 'a[href=#]') + '.dgrid-next', '›'); // « ‹ › »
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
			var grid = this;
			this._trackError(function(){
				var count = grid.rowsPerPage,
					start = (page - 1) * count,
					options = lang.delegate(grid.queryOptions || {}, {
						start: start,
						count: count
					}),
					results,
					contentNode = grid.contentNode,
					rows = grid._rowIdToObject,
					substrLen = 5 + grid.id.length, // trimmed from front of row IDs
					r, loadingNode;
				
				if(grid.sortOrder){ options.sort = grid.sortOrder; }
				
				// remove any currently-rendered rows
				for(r in rows){
					grid.row(r.substr(substrLen)).remove();
				}
				grid._rowIdToObject = {};
				contentNode.innerHTML = "";
				
				loadingNode = put(contentNode, "div.dgrid-loading");
				
				// set flag to deactivate pagination event handlers until loaded
				grid._isLoading = true;
				
				// Run new query and pass it into renderArray
				results = grid.store.query(grid.query, options);
				
				Deferred.when(results.total, function(total){
					// update status text based on now-current page and total
					grid.paginationStatusNode.innerHTML = string.substitute(i18n.status, {
						start: start + 1,
						end: start + count,
						total: total
					});
					grid._total = total;
					grid._currentPage = page;
					grid.updateNavigation();
				});
				
				return Deferred.when(grid.renderArray(results, loadingNode, options), function(trs){
					put(loadingNode, "!");
					delete grid._isLoading;
					// reset scroll position now that new page is loaded
					grid.bodyNode.scrollTop = 0;
				}, function(error){
					// enable loading again before throwing the error
					delete grid._isLoading;
					throw error;
				});
			});
		}
	});
});