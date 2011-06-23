define(["dojo/has", "xstyle/create", "dojo/_base/declare", "dojo/on", "dojo/aspect", "dojo/query", "./Grid","xstyle/css!./css/columnset.css", "dojo/_base/sniff"], 
	function(has, create, declare, listen, aspect, query, Grid, xstyle){
		//	summary:
		//		This module provides column sets to isolate horizontal scroll of sets of 
		// 		columns from each other. This mainly serves the purpose of allowing for
		// 		column locking. 
	
	return declare([Grid], {
		columnSets: [],
		createRowCells: function(tag, each){
			var row = create("table");			
			if(has("ie") < 8 && !has("quirks")){
				row.style.width = "auto"; // in IE7 this is needed to instead of 100% to make it not create a horizontal scroll bar
			}
			var tr = create(row, "tbody tr");
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				// iterate through the columnSets
				var columnSet = this.columnSets[i];
				var cell = create(tr, tag + ".d-list-column-set-cell.column-set-" + i + " div.d-list-column-set[colsetid=" + i + "]");
				/*var td = create(tag + ".d-list-column-set[colsetid=" + i + "]"*/
				if(dojo.isIE < 8 && !dojo.isQuirks){
					cell.style.width = "auto"; // in IE7 this is needed to instead of 100% to make it not create a horizontal scroll bar
				}
				this.columns = columnSet;
				cell.appendChild(this.inherited(arguments));
			}
			return row;
		},
		createRow: function(){
			var row = this.inherited(arguments);
			var scrollLefts = this._columnSetScrollLefts;
			function adjustScrollLeft(){
				query(".d-list-column-set", row).forEach(function(element){
					element.scrollLeft = scrollLefts[element.getAttribute('colsetid')];
				});
			}
			if(has("ie") < 8 || has("quirks")){
				setTimeout(adjustScrollLeft, 1);
			}else{
				adjustScrollLeft();
			}
			return row;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the grid
			this.inherited(arguments);
			var columnSets = this.columnSets;
			this.bodyNode.style.bottom = "17px";
			var domNode = this.domNode;
			var scrollers = this._columnSetScrollers = {};
			var scrollerContents = this._columnSetScrollerContents = {};
			var scrollLefts = this._columnSetScrollLefts = {}; 
			for(var i = 0, l = columnSets.length; i < l; i++){
				(function(columnSet, i){
					var scroller = scrollers[i] = create(domNode, ".d-list-column-set-scroller[colsetid=" + i +"]");
					scrollerContents[i] = create(scroller, ".d-list-column-set-scroller-content");
					listen(scroller, "scroll", function(event){
						var scrollLeft = this.scrollLeft;
						scrollLefts[i] = scrollLeft;
						query('.d-list-column-set[colsetid="' + i +'"]', domNode).forEach(function(element){
							element.scrollLeft = scrollLeft;
						});
					});
				})(columnSets[i], i);
			}
			var grid = this;
			positionScrollers(this, domNode);
			function reposition(){
				positionScrollers(grid, domNode);
			}
			listen(window, "resize", reposition); 
			aspect.after(this, "styleColumn", reposition);		
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
			var columnSetElement = query('.d-list-column-set[colsetid="' + i +'"]', domNode)[0];
			var scrollerWidth = columnSetElement.offsetWidth;
			var contentWidth = columnSetElement.firstChild.offsetWidth;
			scrollerContents[i].style.width = contentWidth + "px";
			scrollers[i].style.width = scrollerWidth + "px";
			scrollers[i].style.overflowX = contentWidth > scrollerWidth ? "scroll" : "auto"; // IE seems to need it be set explicitly
			scrollers[i].style.left = left + "px";
		}	
	}
});