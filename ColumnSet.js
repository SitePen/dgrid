define(["dojo/_base/html", "dojo/_base/declare", "dojo/listen", "dojo/query", "./Table","cssx/css!./css/columnset.css"], 
	function(dojo, declare, listen, query, Table, cssx){
		//	summary:
		//		This module provides column sets to isolate horizontal scroll of sets of 
		// 		columns from each other. This mainly serves the purpose of allowing for
		// 		column locking. 
	var create = dojo.create;
	
	return declare([Table], {
		columns: [],
		createRowCells: function(tag, each){
			var row = create("table", {
			});			
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
				this.columns = columnSet;
				td.appendChild(this.inherited(arguments));
			}
			return row;
		},
		createRow: function(){
			var row = this.inherited(arguments);
			var columnSets = this.columnSets;
			query(".dojoxGridxColumnSet").forEach(function(element){
				element.scrollLeft = columnSets[element.getAttribute('colsetid')].scrollLeft;
			});
			return row;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the table
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
						query('.dojoxGridxColumnSet[colsetid="' + i +'"]').forEach(function(element){
							element.scrollLeft = scrollLeft;
						});
					});
				})(columnSets[i], i);
			}
			positionScrollers(columnSets);
			listen(window, "resize", function(){
				positionScrollers(columnSets);
			});
		}
	});
	function positionScrollers(columnSets){
		var left = 0, scrollerWidth = 0;
		for(var i = 0, l = columnSets.length; i < l; i++){
			// iterate through the columnSets
			left += scrollerWidth;
			var columnSetElement = query('.dojoxGridxColumnSet[colsetid="' + i +'"]')[0];
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