define(["dojo/_base/declare", "dojo/on", "dojo/query", "dojo/dom", "put-selector/put", "dojo/dom-geometry", "dojo/dom-class", "dojo/touch", "dojo/has", "dojo/_base/html", "xstyle/css!../css/extensions/ColumnResizer.css"],
function(declare, listen, query, dom, put, geom, cls, touch, has){

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
		var x = this.styleColumn(colId, "width: " + width + "px;");
	},
	renderHeader: function(){
		this.inherited(arguments);
		
		var grid = this;
		grid.gridWidth = grid.headerNode.clientWidth - 1; //for some reason, total column width needs to be 1 less than this

		for(id in this.columns){
			var col = this.columns[id];
			var colNode = query(".column-"+id, grid.domNode)[0]; //grabs header node

			var headerTextNode = put("div.dgrid-resize-header-container");
			colNode.contents = headerTextNode;
			var childNodes = colNode.childNodes;
			// move all the children to the header text node
			while(childNodes.length > 0){
				put(headerTextNode, childNodes[0]);
			}
			listen(put(colNode, headerTextNode, "div.dgrid-resize-handler.resizeNode-"+id), touch.press, function(e){
					e.preventDefault(); // Added for mobile
					grid._resizeMouseDown(e);
			});
		}
		if(!grid.mouseMoveListen){
			grid.mouseMoveListen = listen.pausable(document.body, touch.move, function(e){
				// while resizing, update the position of the resizer bar
				if(!grid._resizing){return;}
				grid._updateResizerPosition(e);
			});
			grid.mouseUpListen = listen.pausable(document.body, touch.release, function(e){
				if(!grid._resizing){return;}
				grid._resizeMouseUp(e);
				grid.mouseMoveListen.pause();
				grid.mouseUpListen.pause();
			});
		}
	}, // end renderHeader

	_resizeMouseDown: function(e){
	// Summary:
	//      called when mouse button is pressed on the header
	// e: Object
	//      mousedown event object
		
		// preventDefault actually seems to be enough to prevent browser selection
		// in all but IE < 9.  setSelectable works for those.
		e.preventDefault();
		dom.setSelectable(this.domNode, false);
		var grid = this;
		grid._resizing = true;
		grid._startX = grid._getResizeMouseLocation(e); //position of the target
		
		// Grab the position of the grid within the body;  will be used to place the resizer in the correct place
		// Since geom.position returns an incorrect "x" value (due to mobile zoom and getBoundingClientRect()),
		// webkitConvertPointFromNodeToPage and WebKitPoint will provide a more accurate point
		var hasPointFromNode = has("touch") && webkitConvertPointFromNodeToPage;
		grid._gridX = hasPointFromNode ? 
						webkitConvertPointFromNodeToPage(grid.bodyNode, new WebKitPoint(0, 0)).x : 
						geom.position(grid.bodyNode).x;
						
		grid._targetCell = grid._getResizeCell(e);
		
		// show resizer inlined
		if(!grid._resizer){
			grid._resizer = put(grid.domNode, "div.dgrid-column-resizer");
		}else{
			grid.mouseMoveListen.resume();
			grid.mouseUpListen.resume();
		}

		grid._resizer.style.display = "block";
		grid._updateResizerPosition(e);
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
			for(id in this.columns){
				var col = this.columns[id];
				var width = query("#" + this.domNode.id + " .column-"+id)[0].offsetWidth;
				this.resizeColumnWidth(id, width);
			}
			this._resizedColumns = true;
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
		}
		else if(e.clientX){
			posX = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
		}
		return posX;
	},
	_getResizeCell: function(e){
	// Summary:
	//      get the target of the mouse move event
	// e: Object
	//      mousemove event object
		var node;
		if(e.target){
			node = e.target;
		}else if(e.srcElement){
			node = e.srcElement;
		}
		if(node.nodeType == 3 || !node.columnId){ // defeat Safari bug first and IE oddity 2nd
			node = node.parentNode.parentNode;
		}
		return node;
	},
	_getResizedColumnWidths: function (){
	//Summary:
	//      returns object containing new column width and column id
		var totalWidth = 0;
		var lastColId = null;
		for(id in this.columns){
			var col = this.columns[id];
			var width = query("#" + this.domNode.id + " .column-"+id)[0].offsetWidth;
			totalWidth += width;
			lastColId = id;
		}
		return {totalWidth: totalWidth, lastColId: lastColId};
	}
});
});
