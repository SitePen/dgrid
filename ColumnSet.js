define(["xstyle/css!./css/columnset.css", "dojo/has", "put-selector/put", "dojo/_base/declare", "dojo/on", "dojo/aspect", "dojo/query", "./Grid", "xstyle/has-class", "dojo/_base/sniff"], 
function(styleSheet, has, put, declare, listen, aspect, query, Grid, hasClass){
		//	summary:
		//		This module provides column sets to isolate horizontal scroll of sets of 
		// 		columns from each other. This mainly serves the purpose of allowing for
		// 		column locking.
	hasClass("safari", "ie-7");
	return declare([Grid], {
		columnSets: [],
		createRowCells: function(tag, each){
			var row = put("table.dgrid-row-table");	
			var tr = put(row, "tbody tr");
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				// iterate through the columnSets
				var columnSet = this.columnSets[i];
				var cell = put(tr, tag + ".dgrid-column-set-cell.column-set-" + i + " div.dgrid-column-set[colsetid=" + i + "]");
				/*var td = put(tag + ".dgrid-column-set[colsetid=" + i + "]"*/
				this.subRows = columnSet;
				cell.appendChild(this.inherited(arguments));
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
			var columnSets = this.columnSets;
			this.bodyNode.style.bottom = "17px";
			var domNode = this.domNode;
			var scrollers = this._columnSetScrollers;
			var scrollerContents = this._columnSetScrollerContents = {};
			var scrollLefts = this._columnSetScrollLefts = {}; 
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
			
			if (scrollers) {
				// this isn't the first call; destroy existing scroller nodes first
				for(var i in scrollers){
					put("!", scrollers[i]);
				}
			}
			
			// reset to new object to be populated in loop below
			scrollers = this._columnSetScrollers = {};
			
			for(var i = 0, l = columnSets.length; i < l; i++){
				(function(columnSet, i){
					var scroller = scrollers[i] =
						put(domNode, "div.dgrid-column-set-scroller.dgrid-scrollbar-height.column-set-scroller-" + i + "[colsetid=" + i +"]");
					scrollerContents[i] = put(scroller, "div.dgrid-column-set-scroller-content");
					listen(scroller, "scroll", onScroll);
				})(columnSets[i], i);
			}
			var grid = this;
			positionScrollers(this, domNode);
			function reposition(){
				positionScrollers(grid, domNode);
			}
			aspect.after(this, "resize", reposition);
			listen(domNode, ".dgrid-column-set:cellfocusin", onScroll);
			aspect.after(this, "styleColumn", reposition);		
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
			this.configStructure();
			this._updateColumns();
		}
	});
	function positionScrollers(grid, domNode){
		var left = 0, scrollerWidth = 0;
		var scrollers = grid._columnSetScrollers;
		var scrollerContents = grid._columnSetScrollerContents;
		var columnSets = grid.columnSets;
		for(var i = 0, l = columnSets.length; i < l; i++){
			// iterate through the columnSets
			left += scrollerWidth;
			var columnSetElement = query('.dgrid-column-set[colsetid="' + i +'"]', domNode)[0];
			var scrollerWidth = columnSetElement.offsetWidth;
			var contentWidth = columnSetElement.firstChild.offsetWidth;
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