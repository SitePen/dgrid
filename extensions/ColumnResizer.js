define(["dojo/_base/declare", "dojo/on", "dojo/query", "dojo/dom", "put-selector/put", "dojo/dom-geometry", "dojo/dom-class", "dojo/_base/html", "xstyle/css!../css/extensions/ColumnResizer.css"],
function(declare, listen, query, dom, put, geom, cls){
	
return declare([], {
	resizeNode: null,
	minWidth: 40,	//minimum column width in px
	gridWidth: null, //place holder for the grid width property
	_resizedColumns: false, //flag that indicates if resizer has converted column widths to px
	resizeColumnWidth: function(colId, width){
		// Summary:
		//      calls grid's styleColumn function to add a style for the column
		// colId: String
		//      column id
		// width: Integer
		//      new width of the column
		if(!this._columnStyles){
			this._columnStyles = {};
		}
		var old = this._columnStyles[colId];
		var x = this.styleColumn(colId, "width: " + width + "px;");
		old && old.remove();

		// keep a reference
		this._columnStyles[colId] = x;
	},
	configStructure: function(){
		this._resizedColumns = false;
		for(var name in this._columnStyles){
			this._columnStyles[name].remove();
		}
		this._columnStyles = {};

		this.inherited(arguments);
	},
	renderHeader: function(){
		this.inherited(arguments);
		
		var grid = this;
		grid.gridWidth = grid.headerNode.clientWidth - 1; //for some reason, total column width needs to be 1 less than this

		var colNodes = query(".dgrid-cell", grid.headerNode),
			i = colNodes.length;

		while(i--){
			var colNode = colNodes[i],
				id = colNode.columnId,
				col = this.columns[id],
				childNodes = colNode.childNodes;

			if(!col){ continue; }

			var headerTextNode = put("div.dgrid-resize-header-container");
			colNode.contents = headerTextNode;

			// move all the children to the header text node
			while(childNodes.length){
				put(headerTextNode, childNodes[0]);
			}
			var resizer = put(colNode, headerTextNode, "div.dgrid-resize-handler.resizeNode-"+id);
			if(resizer){
				resizer.columnId = id;
			}
		}

		if(!grid.mouseMoveListen){
			listen(grid.headerNode, ".dgrid-resize-handler:mousedown", function(e){
				grid._resizeMouseDown(e, target);
			});
			grid.mouseMoveListen = listen.pausable(document.body, "mousemove", function(e){
				// while resizing, update the position of the resizer bar
				if(!grid._resizing){return;}
				grid._updateResizerPosition(e);
			});
			grid.mouseUpListen = listen.pausable(document.body, "mouseup", function(e){
				if(!grid._resizing){return;}
				grid._resizeMouseUp(e);
				grid.mouseMoveListen.pause();
				grid.mouseUpListen.pause();
			});
		}
	}, // end renderHeader

	_resizeMouseDown: function(e, target){
		// Summary:
		//      called when mouse button is pressed on the header
		// e: Object
		//      mousedown event object
		
		// preventDefault actually seems to be enough to prevent browser selection
		// in all but IE < 9.  setSelectable works for those.
		e.preventDefault();
		dom.setSelectable(this.domNode, false);
		this._resizing = true;
		this._startX = this._getResizeMouseLocation(e); //position of the target
		this._gridX = geom.position(this.bodyNode).x;//position of the grid in the body *not sure why we need this?*

		this._targetCell = target.parentNode.parentNode;
		
		// show resizer inlined
		if(!this._resizer){
			this._resizer = put(this.domNode, "div.dgrid-column-resizer");
		}else{
			this.mouseMoveListen.resume();
			this.mouseUpListen.resume();
		}

		this._resizer.style.display = "block";
		this._updateResizerPosition(e);
	},
	_resizeMouseUp: function(e){
		// Summary:
		//      called when mouse button is released
		// e: Object
		//      mouseup event object

		this._resizing = false;
		this._readyToResize = false;

		//This is used to set all the column widths to a static size
		if(!this._resizedColumns){
			var colNodes = query(".dgrid-cell", this.headerNode),
				i = colNodes.length;

			while(i--){
				var colNode = colNodes[i],
					id = colNode.columnId,
					width = colNode.offsetWidth;
				this.resizeColumnWidth(id, width);
			}
		}
		dom.setSelectable(this.domNode, true);

		var cell = this._targetCell,
			delta = this._getResizeMouseLocation(e) - this._startX, //final change in position of resizer
			newWidth = cell.offsetWidth + delta, //the new width after resize
			obj = this._getResizedColumnWidths(),//get current total column widths before resize
			totalWidth = obj.totalWidth,
			lastCol = obj.lastColId,
			lastColWidth = query("#" + this.domNode.id + " .column-"+lastCol)[0].offsetWidth;

		if(cell.columnId != lastCol){
			if(totalWidth + delta < this.gridWidth) {
				//need to set last column's width to auto
				this.styleColumn(lastCol, "width: auto;");
			}else if(lastColWidth-delta <= this.minWidth) {
				//change last col width back to px, unless it is the last column itself being resized...
				this.resizeColumnWidth(lastCol, this.minWidth);
			}
		}
		if(newWidth < this.minWidth){
			//enforce minimum widths
			newWidth = this.minWidth;
		}

		this.resizeColumnWidth(cell.columnId, newWidth);
		this.resize();
		this._hideResizer();
	},
	_updateResizerPosition: function(e){
		// Summary:
		//      updates position of resizer bar as mouse moves
		// e: Object
		//      mousemove event object

		var mousePos = this._getResizeMouseLocation(e),
			delta = mousePos - this._startX, //change from where user clicked to where they drag
			cell = this._targetCell,
			left = mousePos - this._gridX;
		if(cell.offsetWidth + delta < this.minWidth){ 
			left = this._startX - this._gridX - (cell.offsetWidth - this.minWidth); 
		}
		this._resizer.style.left = left  + "px";
	},

	_hideResizer: function(){
		// Summary:
		//      sets resizer bar display to none
		this._resizer.style.display = "none";
	},
	_getResizeMouseLocation: function(e){
		//Summary:
		//      returns position of mouse relative to the left edge
		// e: event object
		//      mouse move event object
		var posX = 0;
		if(e.pageX){
			posX = e.pageX;
		}else if(e.clientX){
			posX = e.clientX + document.body.scrollLeft +
				document.documentElement.scrollLeft;
		}
		return posX;
	},
	_getResizedColumnWidths: function (){
		//Summary:
		//      returns object containing new column width and column id
		var totalWidth = 0,
			colNodes = query(".dgrid-cell", this.headerNode),
			i = colNodes.length;

		if(!i){ return {}; }

		var lastColId = colNodes[i-1].columnId;

		while(i--){
			totalWidth += colNodes[i].offsetWidth;
		}
		return {totalWidth: totalWidth, lastColId: lastColId};
	}
});
});
