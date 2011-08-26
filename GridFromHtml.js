define(["./Grid", "dojo/_base/declare", "dojo/_base/lang", "dojo/dom-construct", "dojo/_base/Deferred", "require"], function(Grid, declare, lang, domConstruct, Deferred, require){
	// This module supports parsing grid structure information from an HTML table.
	// This module does NOT support ColumnSets; see GridWithColumnSetsFromHtml
	
	function getSubRowsFromDom(domNode){
		// summary:
		//		generate columns from DOM. Should this be in here, or a separate module?
		var
			columns = [], // to be pushed upon / returned
			trs = domNode.getElementsByTagName("tr"),
			trslen = trs.length,
			getCol = GridFromHtml.utils.getColumnFromCell;
		
		for(var i = 0; i < trslen; i++){
			var rowColumns = [];
			columns.push(rowColumns);
			var tr = trs[i];
			var ths = tr.getElementsByTagName("th"), thslen = ths.length;
			for(var j = 0; j < thslen; j++){
				rowColumns.push(getCol(ths[j]));
			}
		}
		if(tr){
			// FIXME: this assumes that applicable TRs were ONLY found under one
			// grouping element!  Maybe should limit to thead like dojox grid?
			// (Especially if we ever want to support tbody>tr>td -> renderArray)
			domNode.removeChild(tr.parentNode);
		}
		
		return columns;
	}
	
	var GridFromHtml = declare([Grid], {
		configStructure: function(){
			// summary:
			//		Configure subRows based on HTML originally in srcNodeRef
			if(!this._checkedTrs){
				this._checkedTrs = true;
				this.subRows = getSubRowsFromDom(this.srcNodeRef, this.subRows);
			}
			return this.inherited(arguments);
		},
		
		create: function(params, srcNodeRef){
			// We need to replace srcNodeRef, presumably a table, with a div.
			// (Otherwise we'll generate highly invalid markup, which IE doesn't like)
			var
				div = document.createElement("div"),
				style = srcNodeRef.getAttribute("style");
			
			// Copy some commonly-used attributes...
			div.id = srcNodeRef.id;
			div.className = srcNodeRef.className;
			style && div.setAttribute("style", style);
			
			// replace srcNodeRef in DOM with the div
			srcNodeRef.parentNode.replaceChild(div, srcNodeRef);
			
			// call inherited with the new node
			// (but configStructure will look at srcNodeRef)
			this.inherited(arguments, [params, div]);
			
			// destroy srcNodeRef for good now that we're done with it
			domConstruct.destroy(srcNodeRef);
		}
	});
	
	// hang some utility functions, potentially useful for extensions
	GridFromHtml.utils = {
		// Functions for getting various types of values from HTML attributes
		getObjFromAttr: function(node, attr){
			// used to for e.g. formatter, get, renderCell
			var val = node.getAttribute(attr);
			return val && lang.getObject(val);
		},
		getBoolFromAttr: function(node, attr){
			// used for e.g. sortable
			var val = node.getAttribute(attr);
			return val && val !== "false";
		},
		getNumFromAttr: function(node, attr){
			// used for e.g. rowSpan, colSpan
			var val = node.getAttribute(attr);
			val = val && Number(val);
			return isNaN(val) ? undefined : val;
		},
		
		// Function for aggregating th attributes into column properties
		getColumnFromCell: function(th){
			var
				getObj = GridFromHtml.utils.getObjFromAttr,
				getBool = GridFromHtml.utils.getBoolFromAttr,
				getNum = GridFromHtml.utils.getNumFromAttr;
			
			return {
				label: th.innerHTML,
				field: th.getAttribute("field") || th.className || th.innerHTML,
				className: th.className,
				sortable: getBool(th, "sortable"),
				get: getObj(th, "get"),
				formatter: getObj(th, "formatter"),
				renderCell: getObj(th, "renderCell"),
				rowSpan: getNum(th, "rowspan"),
				colSpan: getNum(th, "colspan")
			}
		}
	}
	return GridFromHtml;
});