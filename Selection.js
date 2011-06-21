define(["dojo/_base/declare", "dojo/Stateful", "dojo/on"], function(declare, Stateful, listen){
return declare([], {
	// summary:
	// 		Add selection capabilities to a grid. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	create: function(){
		this.selection = new Stateful();
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
			listen(this.contentNode, ".d-list-row:mousedown, .d-list-row:keydown", function(event){
				if(event.type == "mousedown" || event.keyCode == 32){
					event.preventDefault();
					var focusElement = event.target;
					while(focusElement.getAttribute && !focusElement.getAttribute("tabIndex")){
						focusElement = focusElement.parentNode;
					}
					if(focusElement.focus){
						focusElement.focus();
					}
					var thisRow = grid.row(event);
					if(thisRow){
						var targetElement = thisRow.element;
						var selection = grid.selection;
						var id = thisRow.id;
						if(mode == "single" || (!event.ctrlKey && mode == "extended")){
							grid.clearSelection();
							set(grid, targetElement, id, true);
						}else{
							set(grid, targetElement, id, !selection[id]);
						}
						if(event.shiftKey && mode != "single"){
							var lastElement = lastRow && lastRow.element;
							// find if it is earlier or later in the DOM
							var traverser = (lastElement && (lastElement.compareDocumentPosition ? 
								lastElement.compareDocumentPosition(targetElement) == 2 :
								lastElement.sourceIndex > targetElement.sourceIndex)) ? "nextSibling" : "previousSibling";
							var nextNode;
							while(nextNode = thisRow.element[traverser]){
								// loop through and set everything
								thisRow = grid.row(nextNode);
								set(grid, thisRow.element, thisRow.id, true);
								if(nextNode == lastElement){
									break;
								}
							}
						}else{
							lastRow = thisRow;
						}
					}
				}
				
			});
		}
		grid.selection.watch(function(id, oldValue, value){
			dojo[value ? "addClass" : "removeClass"](grid.row(id).element, "d-list-row-selected");
			dojo[value ? "addClass" : "removeClass"](grid.row(id).element, "ui-state-active");
		});
	},
	// selection:
	// 		A stateful object (get/set/watch) where the property names correspond to 
	// 		object ids and values are true or false depending on whether an item is selected
	selection: {},
	// selectionMode: String
	// 		The selection mode to use, can be "multiple", "single", or "extended".
	selectionMode: "extended",
	select: function(rowId, colId){
		set(this, this.row(rowId).element, id, true);
	},
	deselect: function(id){
		set(this, this.row(id).element, id, false);
	},
	clearSelection: function(){
		var selection = this.selection;
		for(var i in selection){
			if(selection.hasOwnProperty(i) && typeof selection[i] != "function"){
				this.deselect(i);
			}
		}		
	},
	selectAll: function(){
		this.allSelected = true;
		for(var i in this._rowIdToObject){
			var row = this.row(this._rowIdToObject[i]);
			set(this, row.element, row.id, true);
		}
	},
	renderCollection: function(){
		var rows = this.inherited(arguments);
		for(var i = 0; i < rows.length; i++){
			var row = this.row(rows[i]);
			if(this.selection[row.id] || this.allSelected){
				set(this, rows[i], row.id, true);
			}
		}
		return rows;
	}
});
function set(grid, target, rowId, colId, value){
	if(listen.emit(target, value ? "select" : "deselect", {
		cancelable: true,
		bubbles: true,
		id: rowId,
		colId: colId
	})){
		var selection = grid.selection;
		var row = selection[rowId];
		if(colId){
			row = row || {};
			row[colId] = value;
		}else{
			row = value;
		}
		grid.selection.set(id, row);
	}
}

});