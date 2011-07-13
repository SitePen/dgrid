define(["dojo/_base/kernel", "dojo/_base/declare", "dojo/on", "dojo/query", "dojo/_base/html", 'xstyle/css!../resources/resize.css'], function(dojo, declare, listen){
	
return declare([], {
	resizeNode: null,
	minWidth: 40,	//minimum column width in px
	detectWidth: 5, //distance from cell edge that the resize mouse cursor changes
	gridWidth: null, //place holder for the grid width property
	setColumnWidth: function(colId, width){
	// Summary:
	//      calls grid's styleColumn function to add a style for the column
	// colId: String
	//      column id
	// width: Integer
	//      new width of the column
		
		this.styleColumn(colId, "width: " + width + 'px;');
		this.resize();
	},
	postCreate: function(){
		this.inherited(arguments);
		//console.log("this: ", this);
		var grid = this,
			body = document.body;
		grid.gridWidth = grid.headerNode.clientWidth;

		listen(grid.headerNode, "mousemove", function(e){
			//listens for the mouse to move over the header node
			if(grid._resizing || !grid._getCell(e)){return;}
			grid._mouseMove(e);
		});
		listen(grid, '.' + this.getCSSClass("header") + ":mouseout", function(e){ // should this be the mouse.leave event?
			//listens for the mouse to leave the headerNode (even though it doesn't do anything special if it does...)
			if(grid._resizing){return;}
			grid._readyToResize = false;
			dojo.removeClass(dojo.body(), 'dojoxGridxColumnResizing');
		});
		listen(grid, '.' + this.getCSSClass("header") + ":mousedown", function(e){
			// if ready to resize, allow resize
			if(!grid._readyToResize){return;}
				grid._mouseDown(e);
		});
		listen(body, "mousemove", function(e){
			// while resizing, update the position of the resizer bar
			if(!grid._resizing){return;}
			grid._updateResizerPosition(e);
		});
		listen(body, "mouseup", function(e){
			// if resizing and mouse button is release, fire mouseUp()
			if(!this._resizing){return;}
				grid._mouseUp(e);
		});
	},//end postCreate

	_mouseMove: function(e){
	// Summary:
	//      called when mouse moves over the header node
	// e: Object
	//      mouse move object

		if(this._isInResizeRange(e)){
			this._readyToResize = true;
			dojo.addClass(dojo.body(), 'dojoxGridxColumnResizing');
		}else{
			this._readyToResize = false;
			dojo.removeClass(dojo.body(), 'dojoxGridxColumnResizing');
		}
	},

	_mouseDown: function(e){
	// Summary:
	//      called when mouse button is pressed on the header
	// e: Object
	//      mousedown event object
		
		dojo.setSelectable(this.domNode, false);
		var grid = this;
		grid._resizing = true;
		grid._startX = e.clientX; //position of the target  
		grid._gridX = dojo.position(grid.bodyNode).x;//position of the grid in the body

		// show resizer inlined
		if(!grid._resizer){
			grid._resizer = dojo.create('div', {
				className: 'dojoxGridxColumnResizer'},
				grid.domNode, 'last');
			listen(grid._resizer, 'mouseup', function(e){
				grid._mouseUp(e);
			});
		}
		grid._resizer.style.display = 'block';
		grid._updateResizerPosition(e);
	},
	_mouseUp: function(e) {
	// Summary:
	//      called when mouse button is released
	// e: Object
	//      mouseup event object

		this._resizing = false;
		this._readyToResize = false;
		dojo.removeClass(dojo.body(), 'dojoxGridxColumnResizing');
		dojo.setSelectable(this.domNode, true);

		var cell = this._targetCell,
			delta = e.clientX - this._startX, //final change in position of resizer
			w = cell.offsetWidth + delta; //w is the new width after resize

		if(w < this.minWidth){
			w = this.minWidth;
		}
		this.setColumnWidth(cell.columnId, w);
		this._hideResizer();
	},
	_updateResizerPosition: function(e){
	// Summary:
	//      updates position of resizer bar as mouse moves
	// e: Object
	//      mousemove event object

		var delta = e.clientX - this._startX, //change from where user clicked to where they drag
			cell = this._targetCell,
			left = e.clientX - this._gridX;
		
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

		var cell = this._getCell(e);
		this._targetCell = cell;
		//var x = this._getCellX(e); //something is messed up in huurrr.
		var x = e.layerX; //this does not work in Opera currently.

		if(x < this.detectWidth){
			if(!this._targetCell.previousSibling){
				return false;	//left side of first cell is not able to resize
			}
			return true;
		}else if(x > cell.offsetWidth - this.detectWidth && x <= cell.offsetWidth){

			return true;
		}
		return false;
	},
	
	_getCellX: function(e){
	// Summary:
	//      tries to determine the location of the mouse relative to the cell
	// e: Object
	//      mousemove event object

		var cell = this._targetCell;
		var x = e.layerX;
		if(!cell){
			return 100000;
		}
		if(x < 0){x = e.layerX;} //chrome take layerX as cell x.
		return x;
	},
	
	_getCell: function(e){
	// Summary:
	//      get the target of the mouse move event
	// e: Object
	//      mousemove event object
		var node = e.target;
		while(node && node.tagName && node.tagName.toLowerCase() !== 'th'){
			node = node.parentNode;
		}
		return node;
	}
	
});
});
