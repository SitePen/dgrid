define(["./Grid", "dojo/_base/declare", "dojo/_base/lang"], function(Grid, declare, lang){
	// TODO: Maybe support getting the data from the <tbody> as well
	
	// Functions for getting various types of values from HTML attributes
	function getObjFromAttr(node, attr){
		// used to for e.g. formatter, get, renderCell
		var val = node.getAttribute(attr);
		console.log('getObjFromAttr:', node, attr, ' => ', val);
		return val && lang.getObject(val);
	}
	function getBoolFromAttr(node, attr){
		// used for e.g. sortable
		var val = node.getAttribute(attr);
		return val && val !== "false";
	}
	function getNumFromAttr(node, attr){
		// used for e.g. rowSpan, colSpan
		var val = node.getAttribute(attr);
		val = val && Number(val);
		return isNaN(val) ? undefined : val;
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
					name: th.innerHTML,
					field: th.getAttribute("field") || th.className || th.innerHTML,
					className: th.className,
					sortable: getBoolFromAttr(th, "sortable"),
					get: getObjFromAttr(th, "get"),
					formatter: getObjFromAttr(th, "formatter"),
					renderCell: getObjFromAttr(th, "renderCell"),
					rowSpan: getNumFromAttr(th, "rowspan"),
					colSpan: getNumFromAttr(th, "colspan")
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
			//		Configure subRows based on HTML originally in srcNodeRef
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