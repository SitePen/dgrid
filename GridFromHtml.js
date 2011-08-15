define(["./Grid", "dojo/_base/declare", "dojo/_base/lang"], function(Grid, declare, lang){
	// TODO: Maybe support getting the data from the <tbody> as well
	
	function getObjFromAttr(node, attr){
		// used to get e.g. formatter, get, renderCell... from th's
		var val = node.getAttribute(attr);
		console.log('getObjFromAttr:', node, attr, ' => ', val);
		return val && lang.getObject(val);
	}
	function createColumnsFromDom(domNode, columns){
		// summary:
		//		generate columns from DOM. Should this be in here, or a separate module?
		var trs = domNode.getElementsByTagName("tr"), trslen = trs.length;
		for(var i = 0; i < trslen; i++){
			var rowColumns = [];
			columns.push(rowColumns);
			var tr = trs[i];
			var ths = tr.getElementsByTagName("th"), thslen = ths.length;
			for(var j = 0; j < thslen; j++){
				var th = ths[j];
				rowColumns.push({
					label: th.innerHTML,
					field: th.getAttribute("field") || th.className || th.innerHTML,
					className: th.className,
					// TODO: test editable/sortable
					// probably need something like dojox.grid.cells._base's getBoolAttr
					editable: th.getAttribute("editable"),
					sortable: th.getAttribute("sortable"),
					get: getObjFromAttr(th, "get"),
					formatter: getObjFromAttr(th, "formatter"),
					renderCell: getObjFromAttr(th, "renderCell")
				});
			}
		}
		if(tr){
			domNode.removeChild(tr.parentNode);
		}
	}
	return declare([Grid], {
		configStructure: function(){
			// summary:
			//		Setup the headers for the grid
			if(!this.checkedTrs){
				this.checkedTrs = true;
				// set this.subRows, then let createColumnsFromDom push to it
				this.subRows = [];
				createColumnsFromDom(this.domNode, this.subRows);
			}
			return this.inherited(arguments);
		}
	});
});