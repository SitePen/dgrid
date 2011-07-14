define(["dojo/_base/declare", "dojo/on", "./List", "xstyle/put"], function(declare, listen, List, put){
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
			// this is to stop IE's web accelerator and selection
			listen(this.contentNode, "selectstart", function(event){
				event.preventDefault();
			});
			// listen for actions that should cause selections
			listen(this.contentNode, "mousedown,cellfocusin", function(event){
				if(event.type == "mousedown" || !event.ctrlKey || event.keyCode == 32){
					var row = event.target;
					var selection = grid.selection;
					if(mode == "single" || (!event.ctrlKey && mode == "extended")){
						grid.clearSelection();
						grid.select(row);
					}else{
						grid.select(row, null, null);
					}
					if(event.shiftKey && mode != "single"){
						grid.select(lastRow, row);
					}else{
						lastRow = row;
					}
				}
				
			});
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
			if(!value){
				delete this.selection[row.id];
			}
			if(element){
				if(value){
					put(element, ".dgrid-selected.ui-state-active");
				}else{
					put(element, "!dgrid-selected!ui-state-active");
				}
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
				toElement.sourceIndex > fromElement.sourceIndex)) ? "nextSibling" : "previousSibling";
			var nextNode;
			while(nextNode = row.element[traverser]){
				// loop through and set everything
				row = this.row(nextNode);
				this.select(row);
				if(nextNode == toElement){
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
		for(var i in this._rowIdToObject){
			var row = this.row(this._rowIdToObject[i]);
			this.select(row.id);
		}
	},
	renderArray: function(){
		var rows = this.inherited(arguments);
		for(var i = 0; i < rows.length; i++){
			var row = this.row(rows[i]);
			var selected = this.selection[row.id] || this.allSelected;
			if(selected){
				this.select(row);
			}
		}
		return rows;
	}
});

});