define(["dojo/_base/declare", "dojo/on", "./List", "put-selector/put", "dojo/has"], function(declare, on, List, put, has){
return declare([List], {
	// summary:
	//		Add selection capabilities to a grid. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	
	// selectionEvent: String
	//		event (or events, in dojo/on format) to listen on to trigger select logic
	selectionEvent: "mousedown,cellfocusin",
	
	// deselectOnRefresh: Boolean
	//		If true, the selection object will be cleared when refresh is called.
	deselectOnRefresh: true,
	
	create: function(){
		this.selection = {};
		return this.inherited(arguments);
	},
	postCreate: function(){
		this.inherited(arguments);

		this._initSelectionEvents(); // first time; set up event hooks
	},
	
	// selection:
	//		An object where the property names correspond to 
	//		object ids and values are true or false depending on whether an item is selected
	selection: {},
	// selectionMode: String
	//		The selection mode to use, can be "multiple", "single", or "extended".
	selectionMode: "extended",
	
	setSelectionMode: function(mode){
		// summary:
		//		Updates selectionMode, hooking up listener if necessary.
		if(mode == this.selectionMode){ return; } // prevent unnecessary spinning
		
		// Start selection fresh when switching mode.
		this.clearSelection();
		
		this.selectionMode = mode;
	},
	
	_handleSelect: function(event, currentTarget){
		if(this.selectionMode == "none" || (event.type == "cellfocusin" && event.parentType == "mousedown")){
			// don't run if selection mode is none or if coming from a cellfocusin from a mousedown
			return;
		}

		var mode = this.selectionMode;
		if(event.type == "mousedown" || !event.ctrlKey || event.keyCode == 32){
			var row = event.target, lastRow = this._lastRow;
			//console.log("in focus; event: ", event, "; row: ", row);
			if(mode == "single" && lastRow && event.ctrlKey){
				// allow deselection even within single select mode
				this.deselect(lastRow);
				if(lastRow == row){
					return;
				}
			}
			if(!event.ctrlKey){
				if(mode != "multiple"){
					this.clearSelection();
				}
				this.select(row);
			}else{
				this.select(row, null, null); // toggle
			}
			if(event.shiftKey && lastRow && mode != "single"){ // select range
				this.select(lastRow, row);
			}else{
				// update lastRow reference for potential subsequent shift+select
				// (current row was already selected by earlier logic)
				this._lastRow = row;
			}
			if(event.type == "mousedown" && (event.shiftKey || event.ctrlKey)){
				// prevent selection in firefox
				event.preventDefault();
			}
		}
	},

	_initSelectionEvents: function(){
		// summary:
		//		Performs first-time hookup of event handlers containing logic
		//		required for selection to operate.
		
		var grid = this;
		
		// This is to stop IE8+'s web accelerator and selection.
		// It also stops selection in Chrome/Safari.
		on(this.domNode, "selectstart", function(event){
			// In IE, this also bubbles from text selection inside editor fields;
			// we don't want to prevent that!
			var tag = event.target && event.target.tagName;
			if(tag != "INPUT" && tag != "TEXTAREA"){
				event.preventDefault();
			}
		});
		
		function focus(event){
			grid._handleSelect(event, this);
		}
		
		// listen for actions that should cause selections
		on(this.contentNode, this.selectionEvent, focus);
		if(has("touch")){
			// first listen for touch taps if available
			var lastTouch, lastTouchX, lastTouchY, lastTouchEvent, isTap;
			on(this.contentNode, "touchstart", function(event){
				console.log("touchstart");
				lastTouch = event.touches[0];
				lastTouchX = lastTouch.pageX;
				lastTouchY = lastTouch.pageY;
				lastTouchEvent = event;
				isTap = true;
			});
			on(this.contentNode, "touchmove", function(event){
				var thisTouch = event.touches[0];
				isTap = Math.pow(lastTouchX - thisTouch.pageX, 2) + Math.pow(lastTouchY - thisTouch.pageY, 2) < 100; // 10 pixel radius sound good?
				console.log("touchmove istap: ", isTap);
			});
			on(this.contentNode, "touchend", function(event){
				if(isTap){
					console.log("touchend");
					focus(lastTouchEvent);
				}
			});
		}
	},
	
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
			(!element || on.emit(element, value ? "select" : "deselect", {
			cancelable: true,
			bubbles: true,
			row: row,
			grid: this
		}))){
			if(!value && !this.allSelected){
				delete this.selection[row.id];
			}else{
				selection[row.id] = value;
			}
		}
		if(element){
			// add or remove classes as appropriate
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
	
	refresh: function(){
		if(this.deselectOnRefresh){
			this.selection = {};
		}
		this._lastRow = null;
		this.inherited(arguments);
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
