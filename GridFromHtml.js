define(["./OnDemandGrid", "dojo/_base/declare", "dojo/_base/lang", "dojo/dom-construct", "dojo/_base/Deferred", "require"], function(OnDemandGrid, declare, lang, domConstruct, Deferred, require){
	// This module supports parsing grid structure information from an HTML table.
	// This module does NOT support ColumnSets; see GridWithColumnSetsFromHtml
	
	// name of data attribute to check for column properties
	var bagName = "data-dgrid-column";
	var grid = null; //cheap fix for lacking grid property in column object
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
	
	var GridFromHtml = declare([OnDemandGrid], {
		configStructure: function(){
			// summary:
			//		Configure subRows based on HTML originally in srcNodeRef
			grid = this;
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
				id = srcNodeRef.id,
				style = srcNodeRef.getAttribute("style");
			
			// Copy some commonly-used attributes...
			if(id){ this.id = id; } // will be propagated in List's create
			div.className = srcNodeRef.className;
			style && div.setAttribute("style", style);
			
			// replace srcNodeRef in DOM with the div
			srcNodeRef.parentNode.replaceChild(div, srcNodeRef);
			
			(params = params || {}).srcNodeRef = srcNodeRef;
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
		getPropsFromNode: function(node){
			// used to pull properties out of bag e.g. "data-dgrid-column".
			var obj, str = node.getAttribute(bagName);
			if(!str){ return {}; } // no props bag specified!
			
			// Yes, eval is evil, but this is ultimately the same thing that
			// dojo.parser does for objects.
			try{
				obj = eval("(" + str + ")");
				obj.grid = grid;
			}catch(e){
				throw new Error("Error in " + bagName + " {" + str + "}: " + e.toString());
			}
			return obj;
		},
		
		// Function for aggregating th attributes into column properties
		getColumnFromCell: function(th){
			var
				getObj = GridFromHtml.utils.getObjFromAttr,
				getBool = GridFromHtml.utils.getBoolFromAttr,
				getNum = GridFromHtml.utils.getNumFromAttr,
				obj = {}, tmp;
			
			// inspect standard attributes first
			obj.label = th.innerHTML;
			obj.field = th.className || th.innerHTML; // often overridden in props
			if(th.className){ obj.className = th.className; }
			if((tmp = getNum(th, "rowspan"))){ obj.rowSpan = tmp; }
			if((tmp = getNum(th, "colspan"))){ obj.colSpan = tmp; }
			
			// look for rest of properties in data attribute
			// (properties in data attribute can override the HTML attributes above)
			dojo.mixin(obj, GridFromHtml.utils.getPropsFromNode(th));
			return obj;
		}
	}
	return GridFromHtml;
});