define(["dojo/_base/declare", "dojo/_base/Deferred", "dojo/on", "./List", "put-selector/put", "dojo/has", "dojo/query"],
function(declare, Deferred, on, List, put, has){

var ctrlEquiv = has("mac") ? "metaKey" : "ctrlKey";
return declare([List], {
	// summary:
	//		Add selection capabilities to a grid. The grid will have a selection property and
	//		fire "dgrid-select" and "dgrid-deselect" events.
	
	// selectionDelegate: String
	//		Selector to delegate to as target of selection events.
	selectionDelegate: ".dgrid-row",
	
	// selectionEvents: String
	//		Event (or events, comma-delimited) to listen on to trigger select logic.
	//		Note: this is ignored in the case of touch devices.
	selectionEvents: "mousedown,dgrid-cellfocusin",
	
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
		this._lastSelected = null;
		
		this.selectionMode = mode;
	},
	
	_handleSelect: function(event, currentTarget){
		if(this.selectionMode == "none" || (event.type == "dgrid-cellfocusin" && event.parentType == "mousedown")){
			// don't run if selection mode is none or if coming from a dgrid-cellfocusin from a mousedown
			return;
		}

		var mode = this.selectionMode,
			ctrlKey = event.type == "mousedown" ? event[ctrlEquiv] : event.ctrlKey;
		if(event.type == "mousedown" || !event.ctrlKey || event.keyCode == 32){
			var row = currentTarget,
				lastRow = this._lastSelected;

			if(mode == "single"){
				if(lastRow == row){
					if(ctrlKey){
						// allow deselection even within single select mode
						this.select(row, null, null);
					}
				}else{
					this.clearSelection();
					this.select(row);
				}
				this._lastSelected = row;
			}else{
				var value;
				if(mode == "extended" && !ctrlKey){
					this.clearSelection();
				}
				if(!event.shiftKey){
					// null == toggle; undefined == true;
					lastRow = value = ctrlKey ? null : undefined;
				}
				this.select(row, lastRow, value);

				if(!lastRow){
					// update lastRow reference for potential subsequent shift+select
					// (current row was already selected by earlier logic)
					this._lastSelected = row;
				}
			}
			if(event.type == "mousedown" && (event.shiftKey || ctrlKey)){
				// prevent selection in firefox
				event.preventDefault();
			}
		}
	},

	_initSelectionEvents: function(){
		// summary:
		//		Performs first-time hookup of event handlers containing logic
		//		required for selection to operate.
		
		var grid = this,
			selector = this.selectionDelegate;
		
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
		
		if(has("touch")){
			// first listen for touch taps if available
			var lastTouch, lastTouchX, lastTouchY, lastTouchEvent, isTap;
			on(this.contentNode, on.selector(selector, "touchstart"), function(event){
				lastTouch = event.touches[0];
				lastTouchX = lastTouch.pageX;
				lastTouchY = lastTouch.pageY;
				lastTouchEvent = event;
				isTap = true;
			});
			on(this.contentNode, on.selector(selector, "touchmove"), function(event){
				var thisTouch = event.touches[0];
				isTap = Math.pow(lastTouchX - thisTouch.pageX, 2) + Math.pow(lastTouchY - thisTouch.pageY, 2) < 100; // 10 pixel radius sound good?
			});
			on(this.contentNode, on.selector(selector, "touchend"), function(event){
				if(isTap){
					grid._handleSelect(lastTouchEvent, this);
				}
			});
		}else{
			// listen for actions that should cause selections
			on(this.contentNode, on.selector(selector, this.selectionEvents), focus);
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
		var element = row.element,
			notPrevented = true;
		if(value == previousValue ||
			(!element || (notPrevented = on.emit(element, "dgrid-" + (value ? "select" : "deselect"), {
			cancelable: true,
			bubbles: true,
			row: row,
			grid: this
		})))){
			if(!value && !this.allSelected){
				delete this.selection[row.id];
			}else{
				selection[row.id] = value;
			}
			if(element){
				// add or remove classes as appropriate
				if(value){
					put(element, ".dgrid-selected.ui-state-active");
				}else{
					put(element, "!dgrid-selected!ui-state-active");
				}
			}
		}
		if(toRow && notPrevented){
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
	isSelected: function(object){
		if(!object){
			return false;
		}
		if(!object.element){
			object = this.row(object);
		}

		return !!this.selection[object.id];
	},
	
	refresh: function(){
		if(this.deselectOnRefresh){
			this.selection = {};
		}
		this._lastSelected = null;
		this.inherited(arguments);
	},
	
	renderArray: function(){
		var grid = this,
			rows = this.inherited(arguments);
		
		Deferred.when(rows, function(rows){
			var selection = grid.selection,
				i, row, selected;
			for(i = 0; i < rows.length; i++){
				row = grid.row(rows[i]);
				selected = row.id in selection ? selection[row.id] : grid.allSelected;
				if(selected){
					grid.select(row, null, selected);
				}
			}
		});
		return rows;
	}
});

});
