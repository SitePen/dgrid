define(["xstyle/css!./css/columnset.css", "dojo/has", "put-selector/put", "dojo/_base/declare", "dojo/on", "dojo/aspect", "dojo/query", "./Grid", "xstyle/has-class", "dojo/_base/sniff"], 
function(styleSheet, has, put, declare, listen, aspect, query, Grid, hasClass){
		// summary:
		//		This module provides column sets to isolate horizontal scroll of sets of 
		//		columns from each other. This mainly serves the purpose of allowing for
		//		column locking.
	hasClass("safari", "ie-7");
	return declare([Grid], {
		columnSets: [],
		createRowCells: function(tag, each){
			var row = put("table.dgrid-row-table");	
			var tr = put(row, "tbody tr");
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				// iterate through the columnSets
				var cell = put(tr, tag + ".dgrid-column-set-cell.column-set-" + i + " div.dgrid-column-set[colsetid=" + i + "]");
				cell.appendChild(this.inherited(arguments, [tag, each, this.columnSets[i]]));
			}
			return row;
		},
		renderArray: function(){
			var rows = this.inherited(arguments);
			for(var i = 0; i < rows.length; i++){
				adjustScrollLeft(this, rows[i]);
			}
			return rows;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the grid
			this.inherited(arguments);
			this.bodyNode.style.bottom = "17px";
			
			var columnSets = this.columnSets,
				domNode = this.domNode,
				scrollers = this._columnSetScrollers,
				scrollerContents = this._columnSetScrollerContents = {},
				scrollLefts = this._columnSetScrollLefts = {},
				grid = this,
				i, l;
			
			function onScroll(){
				var scrollLeft = this.scrollLeft;
				var colSetId = this.getAttribute("colsetid");
				if(scrollLefts[colSetId] != scrollLeft){
					scrollLefts[colSetId] = scrollLeft;
					query('.dgrid-column-set[colsetid="' + colSetId +'"],.dgrid-column-set-scroller[colsetid="' + colSetId + '"]', domNode).
						forEach(function(element){
							element.scrollLeft = scrollLeft;
						});
				}
			}
			
			function putScroller(columnSet, i){
				// function called for each columnSet
				var scroller = scrollers[i] =
					put(domNode, "div.dgrid-column-set-scroller.dgrid-scrollbar-height.column-set-scroller-" + i + "[colsetid=" + i +"]");
				scrollerContents[i] = put(scroller, "div.dgrid-column-set-scroller-content");
				listen(scroller, "scroll", onScroll);
			}
			
			function reposition(){
				positionScrollers(grid, domNode);
			}
			
			if (scrollers) {
				// this isn't the first time; destroy existing scroller nodes first
				for(i in scrollers){
					put("!", scrollers[i]);
				}
			} else {
				// first-time-only operations
				aspect.after(this, "resize", reposition);
				listen(domNode, ".dgrid-column-set:dgrid-cellfocusin", onScroll);
				aspect.after(this, "styleColumn", reposition);		
			}
			
			// reset to new object to be populated in loop below
			scrollers = this._columnSetScrollers = {};
			
			for(i = 0, l = columnSets.length; i < l; i++){
				putScroller(columnSets[i], i);
			}
			
			positionScrollers(this, domNode);
		},
		configStructure: function(){
			this.columns = {};
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				// iterate through the columnSets
				var columnSet = this.columnSets[i];
				for(var j = 0; j < columnSet.length; j++){
					columnSet[j] = this._configColumns(i + '-' + j + '-', columnSet[j]);
				}
			}
		},
		setColumnSets: function(columnSets){
			this.columnSets = columnSets;
			this._updateColumns();
		}
	});
	function positionScrollers(grid, domNode){
		var scrollers = grid._columnSetScrollers,
			scrollerContents = grid._columnSetScrollerContents,
			columnSets = grid.columnSets,
			left = 0, scrollerWidth = 0,
			i, l, columnSetElement, contentWidth;
		for(i = 0, l = columnSets.length; i < l; i++){
			// iterate through the columnSets
			left += scrollerWidth;
			columnSetElement = query('.dgrid-column-set[colsetid="' + i +'"]', domNode)[0];
			scrollerWidth = columnSetElement.offsetWidth;
			contentWidth = columnSetElement.firstChild.offsetWidth;
			scrollerContents[i].style.width = contentWidth + "px";
			scrollers[i].style.width = scrollerWidth + "px";
			scrollers[i].style.overflowX = contentWidth > scrollerWidth ? "scroll" : "auto"; // IE seems to need it be set explicitly
			scrollers[i].style.left = left + "px";
		}	
	}
	function adjustScrollLeft(grid, row){
		var scrollLefts = grid._columnSetScrollLefts;
		function doAdjustScrollLeft(){
			query(".dgrid-column-set", row).forEach(function(element){
				element.scrollLeft = scrollLefts[element.getAttribute('colsetid')];
			});
		}
		if(has("ie") < 8 || has("quirks")){
			setTimeout(doAdjustScrollLeft, 1);
		}else{
			doAdjustScrollLeft();
		}
	}
});
