define(["./Grid", "dojo/_base/declare"], function(Grid, declare){
	// TODO: Maybe support getting the data from the <tbody> as well
	function createColumnsFromDom(domNode, columns){
		// summary:
		//		generate columns from DOM. Should this be in here, or a separate module?
		var trs = domNode.getElementsByTagName("tr");
		for(var i = 0; i < trs.length; i++){
			var rowColumns = [];
			columns.push(rowColumns);
			var tr = trs[i];
			var ths = tr.getElementsByTagName("th");
			for(var j = 0; j < ths.length; j++){
				var th = ths[j];
				rowColumns.push({
					name: th.innerHTML,
					field: th.getAttribute("field") || th.className || th.innerHTML,
					className: th.className,
					editable: th.getAttribute("editable"),
					sortable: th.getAttribute("sortable")
				});
			}
		}
		if(tr){
			domNode.removeChild(tr.parentNode);
		}
	}
	return declare([Grid], {
		renderHeader: function(headerNode){
			// summary:
			//		Setup the headers for the grid
			if(!this.checkedTrs){
				this.checkedTrs = true;
				createColumnsFromDom(this.domNode, this.columns);
			}
			return this.inherited(arguments);
		}
	});
});