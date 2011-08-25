define(["dojo/_base/declare", "dojo/on", "./List", "put-selector/put", "dojo/has"], function(declare, listen, List, put, has){
return declare([List], {
	// summary:
	// 		Add selection capabilities to a grid. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	
	create: function(){
		this.selection = {};
		return this.inherited(arguments);
	},
	postCreate: function(){
		this.inherited(arguments);
		var lastRow, mode = this.selectionMode;
		var grid = this;		
		if(this.selectionMode != "none"){
			// this is to stop IE 8's web accelerator and selection
			listen(grid.domNode, "selectstart", function(event){
				event.preventDefault();
			});
			function focus(event){
				if(!event._selected && (event.type == "mousedown" || !event.ctrlKey || event.keyCode == 32)){
					event._selected = true;
					var row = event.target;
					console.log("in focus");
					if(mode == "single" && lastRow && event.ctrlKey){
						grid.deselect(lastRow);
						if(lastRow == row){
							return;
						}
					}
					if(!event.ctrlKey){
						if(mode != "multiple"){
							grid.clearSelection();
						}
						grid.select(row);
					}else{
						grid.select(row, null, null);
					}
					if(event.shiftKey && mode != "single"){
						grid.select(lastRow, row);
					}else{
						lastRow = row;
					}
					if(event.type == "mousedown" && (event.shiftKey || event.ctrlKey)){
						// prevent selection in firefox
						event.preventDefault();
					}
				}
				
			}
			// listen for actions that should cause selections
			if(has("touch")){
				// first listen for touch taps if available
				var lastTouchX, lastTouchY, lastTouchEvent, isTap;
				listen(this.contentNode, "touchstart", function(event){
					console.log("touchstart");
					lastTouch = event.touches[0];
					lastTouchX = lastTouch.pageX;
					lastTouchY = lastTouch.pageY;
					lastTouchEvent = event;
					isTap = true;
				});
				listen(this.contentNode, "touchmove", function(event){
					var thisTouch = event.touches[0];
					isTap = Math.pow(lastTouchX - thisTouch.pageX, 2) + Math.pow(lastTouchY - thisTouch.pageY, 2) < 100; // 10 pixel radius sound good?
				});
				listen(this.contentNode, "touchend", function(event){
					if(isTap){
						focus(lastTouchEvent);
					}
				});
			}
			listen(grid.contentNode, "mousedown,cellfocusin", focus); 
		}
	},
	// selection:
	// 		An object where the property names correspond to 
	// 		object ids and values are true or false depending on whether an item is selected
	selection: {},
	// selectionMode: String
	// 		The selection mode to use, can be "multiple", "single", or "extended".
	selectionMode: "extended",
	select: function(row, toRow, value){
		if(value === undefined){
			// default to true
			value = true;
		} 
		if(!row.element){
			row = this.row(row);
		}
		var selection = this.selection;
		var previousValue = selection[row.id];
		if(value === null){
			// indicates a toggle
			value = !previousValue;
		}
		var element = row.element;
		if(value != previousValue &&
			(!element || listen.emit(element, value ? "select" : "deselect", {
			cancelable: true,
			bubbles: true,
			row: row
		}))){
			selection[row.id] = value;
			if(!value && !this.allSelected){
				delete this.selection[row.id];
			}
		}
		if(element){
			if(value){
				put(element, ".dgrid-selected.ui-state-active");
			}else{
				put(element, "!dgrid-selected!ui-state-active");
			}
		}
		if(toRow){
			if(!toRow.element){
				toRow = this.row(toRow);
			}
			var toElement = toRow.element;
			var fromElement = row.element;
			// find if it is earlier or later in the DOM
			var traverser = (toElement && (toElement.compareDocumentPosition ? 
				toElement.compareDocumentPosition(fromElement) == 2 :
				toElement.sourceIndex > fromElement.sourceIndex)) ? "down" : "up";
			while(row = this[traverser](row)){
				this.select(row);
				if(row.element == toElement){
					break;
				}
			}
		}
	},
	deselect: function(row, toRow){
		this.select(row, toRow, false);
	},
	clearSelection: function(){
		this.allSelected = false;
		for(var id in this.selection){
			this.deselect(id);
		}
	},
	selectAll: function(){
		this.allSelected = true;
		this.selection = {}; // we do this to clear out pages from previous sorts
		for(var i in this._rowIdToObject){
			var row = this.row(this._rowIdToObject[i]);
			this.select(row.id);
		}
	},
	renderArray: function(){
		var rows = this.inherited(arguments);
		var selection = this.selection;
		for(var i = 0; i < rows.length; i++){
			var row = this.row(rows[i]);
			var selected = row.id in selection ? selection[row.id] : this.allSelected;
			if(selected){
				this.select(row, null, selected);
			}
		}
		return rows;
	}
});

});