define(["dojo/_base/html", "dojo/_base/declare", "dojo/listen", "dojo/query", "./Grid","cssx/css!./css/columnset.css"], 
	function(dojo, declare, listen, query, Grid, cssx){
		//	summary:
		//		This module provides column sets to isolate horizontal scroll of sets of 
		// 		columns from each other. This mainly serves the purpose of allowing for
		// 		column locking. 
	var create = dojo.create;
	
	return declare([Grid], {
		columns: [],
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
				columnSet.scroller
				var td = create("div", {
					className: "dojoxGridxColumnSet",
					colsetid: i
				},  create(tag, null, tr));
				if(dojo.isIE < 8 && !dojo.isQuirks){
					td.style.width = "auto"; // in IE7 this is needed to instead of 100% to make it not create a horizontal scroll bar
				}
				this.columns = columnSet;
				td.appendChild(this.inherited(arguments));
			}
			return row;
		},
		createRow: function(){
			var row = this.inherited(arguments);
			var columnSets = this.columnSets;
			function adjustScrollLeft(){
				query(".dojoxGridxColumnSet", row).forEach(function(element){
					element.scrollLeft = columnSets[element.getAttribute('colsetid')].scrollLeft;
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
			for(var i = 0, l = columnSets.length; i < l; i++){
				(function(columnSet, i){
					columnSet.scroller = create("div",{
						className:"dojoxGridxColumnSetScroller",
						colsetid: i
					}, domNode);
					columnSet.scrollerContent = create("div", {
						className:"dojoxGridxColumnSetScrollerContent"
					}, columnSet.scroller);
					listen(columnSet.scroller, "scroll", function(){
						var scrollLeft = this.scrollLeft;
						columnSet.scrollLeft = scrollLeft;
						query('.dojoxGridxColumnSet[colsetid="' + i +'"]', domNode).forEach(function(element){
							element.scrollLeft = scrollLeft;
						});
					});
				})(columnSets[i], i);
			}
			positionScrollers(columnSets, domNode);
			listen(window, "resize", function(){
				positionScrollers(columnSets, domNode);
			});
		}
	});
	function positionScrollers(columnSets, domNode){
		var left = 0, scrollerWidth = 0;
		for(var i = 0, l = columnSets.length; i < l; i++){
			// iterate through the columnSets
			left += scrollerWidth;
			var columnSetElement = query('.dojoxGridxColumnSet[colsetid="' + i +'"]', domNode)[0];
			var scrollerWidth = columnSetElement.offsetWidth;
			var contentWidth = columnSetElement.firstChild.offsetWidth;
			var columnSet = columnSets[i];
			columnSet.scrollerContent.style.width = contentWidth + "px";
			columnSet.scroller.style.width = scrollerWidth + "px";
			columnSet.scroller.style.overflowX = contentWidth > scrollerWidth ? "scroll" : "auto"; // IE seems to need it be set explicitly
			columnSet.scroller.style.left = left + "px";
		}	
	}
});