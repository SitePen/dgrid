define(["dojo/_base/html", "dojo/_base/declare", "dojo/on", "dojo/aspect", "dojo/query", "./Grid","cssx/css!./css/columnset.css"], 
	function(dojo, declare, listen, aspect, query, Grid, cssx){
		//	summary:
		//		This module provides column sets to isolate horizontal scroll of sets of 
		// 		columns from each other. This mainly serves the purpose of allowing for
		// 		column locking. 
	var create = dojo.create;
	
	return declare([Grid], {
		columnSets: [],
		createRowCells: function(tag, each){
			var row = create("table", {
			});			
			if(dojo.isIE < 8 && !dojo.isQuirks){
				row.style.width = "auto"; // in IE7 this is needed to instead of 100% to make it not create a horizontal scroll bar
			}
			var tr = create("tbody", null, row);
			tr = create("tr", null, tr);
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				// iterate through the columnSets
				var columnSet = this.columnSets[i];
				var cell = create("div", {
					className: "d-list-column-set",
					colsetid: i
				},  create(tag, {
					className: "d-list-column-set-cell column-set-" + i
				}, tr));
				/*var td = create(tag, {
					className: "d-list-column-set",
					colsetid: i
				},  tr);*/
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
			if(dojo.isIE < 8 || dojo.isQuirks){
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
					var scroller = scrollers[i] = create("div",{
						className:"d-list-column-set-scroller",
						colsetid: i
					}, domNode);
					scrollerContents[i] = create("div", {
						className:"d-list-column-set-scroller-content"
					}, scroller);
					listen(scroller, "scroll", function(){
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