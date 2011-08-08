define(["dojo/_base/kernel", "dojo/_base/declare", "dojo/on", "dojo/query", "dojo/_base/html", 'xstyle/css!../resources/resize.css'], function(dojo, declare, listen){
	
return declare([], {
	resizeNode: null,
	minWidth: 40,	//minimum column width in px
	detectWidth: 8, //distance from cell edge that the resize mouse cursor changes
	gridWidth: null, //place holder for the grid width property
	_resizedColumns: false, //flag that indicates if resizer has converted column widths to px
	resizeColumnWidth: function(colId, width){
	// Summary:
	//      calls grid's styleColumn function to add a style for the column
	// colId: String
	//      column id
	// width: Integer
	//      new width of the column
		var x = this.styleColumn(colId, "width: " + width + 'px;');
		this.resize();
	},
	postCreate: function(){
		this.inherited(arguments);
		
		var grid = this,
			body = document.body;
		grid.gridWidth = grid.headerNode.clientWidth - 1; //for some reason, total column width needs to be 1 less than this

		listen(grid.headerNode, "mousemove", function(e){
			//listens for the mouse to move over the header node
			if(grid._resizing || !grid._getResizeCell(e)){return;}
			grid._resizeMouseMove(e);
		});
		listen(grid, '.' + this.getCSSClass("header") + ":mouseout", function(e){ // should this be the mouse.leave event?
			if(grid._resizing){return;}
			grid._readyToResize = false;

			dojo.removeClass(grid.domNode, 'dojoxGridxColumnResizing');
		});
		listen(grid, '.' + this.getCSSClass("header") + ":mousedown", function(e){
			// if ready to resize, allow resize
			if(!grid._readyToResize){return;}
				grid._resizeMouseDown(e);
		});
		listen(body, "mousemove", function(e){
			// while resizing, update the position of the resizer bar
			if(!grid._resizing){return;}
			grid._updateResizerPosition(e);
		});

	},//end postCreate

	_resizeMouseMove: function(e){
	// Summary:
	//      called when mouse moves over the header node
	// e: Object
	//      mouse move object

		if(this._isInResizeRange(e)){
			this._readyToResize = true;
			dojo.addClass(this.domNode, 'dojoxGridxColumnResizing');
		}else{
			this._readyToResize = false;
			dojo.removeClass(this.domNode, 'dojoxGridxColumnResizing');
		}
	},

	_resizeMouseDown: function(e){
	// Summary:
	//      called when mouse button is pressed on the header
	// e: Object
	//      mousedown event object
		
		// preventDefault actually seems to be enough to prevent browser selection
		// in all but IE < 9.  setSelectable works for those.
		e.preventDefault();
		dojo.setSelectable(this.domNode, false);
		
		var grid = this;
		grid._resizing = true;
		grid._startX = grid._getResizeMouseLocation(e); //position of the target
		grid._gridX = dojo.position(grid.bodyNode).x;//position of the grid in the body *not sure why we need this?*

		// show resizer inlined
		if(!grid._resizer){
			grid._resizer = dojo.create('div', {
				className: 'dojoxGridxColumnResizer'},
				grid.domNode, 'last');
			var mouseUpListen = listen(document.body, 'mouseup', function(e){
				if(!grid._resizing){return;}
				grid._resizeMouseUp(e);
			});
		}
		grid._resizer.style.display = 'block';
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
				var width = dojo.query(".column-"+id)[0].offsetWidth;
				this.resizeColumnWidth(id, width);
			}
			this._resizedColumns = true;
		}
		dojo.removeClass(this.domNode, 'dojoxGridxColumnResizing');//not working in opera
		dojo.setSelectable(this.domNode, true);

		var cell = this._targetCell,
			delta = this._getResizeMouseLocation(e) - this._startX, //final change in position of resizer
			newWidth = cell.offsetWidth + delta, //the new width after resize
			obj = this._getResizedColumnWidths(),//get current total column widths before resize
			totalWidth = obj.totalWidth,
			lastCol = obj.lastColId,
			lastColWidth = dojo.query(".column-"+lastCol)[0].offsetWidth;

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
		this._resizer.style.left = left  + 'px';
	},
	_hideResizer: function(){
	// Summary:
	//      sets resizer bar display to none

		this._resizer.style.display = 'none';
	},
	
	_isInResizeRange: function(e){
	// Summary:
	//      checks if mouse is within 5px of the edge of the header cell
	// e: Object
	//      mousemove event object

		var cell = this._getResizeCell(e);
		this._targetCell = cell;
		var mouseX = this._getResizeMouseLocation(e);
		var cellPos = dojo.position(cell, true).x;
		var zoneStart = cellPos + cell.offsetWidth - this.detectWidth;
		var zoneEnd = cellPos + cell.offsetWidth;
		if(mouseX > zoneStart && mouseX <= zoneEnd){
			return true;
		}
		return false;
	},

	_getResizeMouseLocation: function(e){
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
			node = node.parentNode;
		}
		return node;
	},

	_getResizedColumnWidths: function (){
		var totalWidth = 0;
		var lastColId = null;
		for(id in this.columns){
			var col = this.columns[id];
			var width = dojo.query(".column-"+id)[0].offsetWidth;
			totalWidth += width;
			lastColId = id;
		}
		return {totalWidth: totalWidth, lastColId: lastColId};
	}
});
});
