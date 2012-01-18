define(["../_StoreMixin", "dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/query", "dojo/string", "dojo/_base/Deferred", "put-selector/put", "dojo/i18n!./nls/pagination", "xstyle/css!../css/extensions/Pagination.css"],
function(_StoreMixin, declare, lang, on, query, string, Deferred, put, i18n){
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
		// previousNextArrows: Boolean
		// 		Indicate whether or not to show the previous and next arrow links
		previousNextArrows: true,
		// firstLastArrows: Boolean
		// 		Indicate whether or not to show the first and last arrow links
		firstLastArrows: false,
		_currentPage: 1,
		_total: 0,
		// pagingLinks: Number|Boolean
		// 		The number of page links to show on each side of the current page
		//		Set to false to disable the page links
		pagingLinks: 3, 
		// pageSizeOptions: Array[Number]
		// 		This provides options for different page sizes in a dropdown. If it is empty (default)
		// 		no page size dropdown will be displayed		
		pageSizeOptions: [], 
		
		buildRendering: function(){
			var grid = this;
			
			this.inherited(arguments);
			
			// add pagination to footer
			var paginationNode = this.paginationNode =
					put(this.footerNode, "div.dgrid-pagination"),
				statusNode = this.paginationStatusNode =
					put(paginationNode, "div.dgrid-status"),
				pageSizeOptions = this.pageSizeOptions;
			if(pageSizeOptions.length){
				var sizeSelect = put(paginationNode, 'select.dgrid-page-size');
				for(var i = 0; i < pageSizeOptions.length; i++){
					put(sizeSelect, 'option', pageSizeOptions[i], {value: pageSizeOptions[i]});
				}
				on(sizeSelect, "change", function(){
					grid.rowsPerPage = +sizeSelect.value;
					grid.gotoPage(1);
				});
			}

			var navigationNode = this.paginationNavigationNode =
					put(paginationNode, "div.dgrid-navigation");

			var navigationNode = this.paginationNavigationNode,
				currentPage = this._currentPage,
				previousNextLinks = this.previousNextLinks,
				pagingLinks = this.pagingLinks,
				tabIndex = this.tabIndex || 0,
				end = this._total / this.rowsPerPage,
				pagingTextBoxHandle = this._pagingTextBoxHandle;
			if(this.firstLastArrows){
				// create a previous link
				put(navigationNode,  'span[tabIndex=$].dgrid-first', tabIndex, '«');
			}
			if(this.previousNextArrows){
				// create a previous link
				put(navigationNode,  'span[tabIndex=$].dgrid-previous', tabIndex, '‹');
			}
			var grid = this;
			this.paginationLinksNode = put(navigationNode, "span.dgrid-pagination-links");
			if(this.previousNextArrows){
				// create a next link
				put(navigationNode, 'span[tabIndex=$].dgrid-next', tabIndex, '›');	
			}
			if(this.firstLastArrows){
				// create a previous link
				put(navigationNode,  'span[tabIndex=$].dgrid-last', tabIndex, '»');
			}

			
			on(navigationNode, "span:click,span:keydown", function(evt){
				if(evt.type == "click" || evt.keyCode == 32){
					evt.preventDefault();
					if(grid._isLoading){ return; }
					
					var curr = grid._currentPage,
						max = Math.ceil(grid._total / grid.rowsPerPage);
					
					// determine navigation target based on clicked link's class
					if(this.className == "dgrid-page-link"){
						grid.gotoPage(+this.innerHTML, true); // the innerHTML has the page number
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
				}
			});
			
		},
		_updateNavigation: function(focusLink){
			// summary:
			//		Update status and navigation controls based on total count from query
			function pageLink(page){
				var link;
				if(grid.pagingTextBox && page == currentPage){
					// use a paging text box if enabled instead of just a number
					grid._pagingTextBoxHandle = on(link = put(linksNode, 'input.dgrid-page-input[type=text][value=$]', currentPage), "change", function(){
						grid.gotoPage(+this.value, true);
					});
				}else{
					// normal link
					link = put(linksNode, 'span[tabIndex=$]' + (page == currentPage ? '.dgrid-page-disabled' : '') + '.dgrid-page-link', tabIndex, page);
				}
				if(page == currentPage && focusLink){
					// focus on it if we are supposed to retain the focus
					link.focus();
				}
			}
			var grid = this,
				linksNode = this.paginationLinksNode,
				currentPage = this._currentPage,
				pagingLinks = this.pagingLinks,
				tabIndex = this.tabIndex || 0,
				paginationNavigationNode = this.paginationNavigationNode,
				end = Math.ceil(this._total / this.rowsPerPage),
				pagingTextBoxHandle = this._pagingTextBoxHandle;
			pagingTextBoxHandle && pagingTextBoxHandle.remove(); // remove the old handler if it has been created
			linksNode.innerHTML = "";
			query(".dgrid-first, .dgrid-previous", paginationNavigationNode).forEach(function(link){
				put(link, (currentPage == 1 ? "." : "!") + "dgrid-page-disabled");
			});
			query(".dgrid-last, .dgrid-next", paginationNavigationNode).forEach(function(link){
				put(link, (currentPage == end ? "." : "!") + "dgrid-page-disabled");
			});
			
			if(pagingLinks){
				// always include the first page (back to the beginning)
				pageLink(1);
				var start = currentPage - pagingLinks;
				if(start > 2) {
					// visual indication of skipped page links
					put(linksNode, 'span.dgrid-page-skip', '...');
				}else{
					start = 2;
				}
				// now iterate through all the page links we should show
				for(var i = start; i < Math.min(currentPage + pagingLinks + 1, end); i++){
					pageLink(i);
				}
				if(currentPage + pagingLinks + 1 < end){
					put(linksNode, 'span.dgrid-page-skip', '...');
				}
				// last link
				pageLink(end);
			}else if(grid.pagingTextBox){
				// the pageLink will create our textbox for us
				pageLink(currentPage);
			}
		},
		
		refresh: function(){
			if(!this.store){
				throw new Error("Pagination requires a store to operate.");
			}
			this.inherited(arguments);
			// reset to first page
			this.gotoPage(1);
		},
		
		gotoPage: function(page, focusLink){
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
						end: Math.min(total, start + count),
						total: total
					});
					grid._total = total;
					grid._currentPage = page;
					grid._updateNavigation(focusLink);
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