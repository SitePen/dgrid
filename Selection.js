define(["dojo/_base/declare", "dojo/Stateful", "dojo/on", "./List"], function(declare, Stateful, listen, List){
// patch Stateful until Dojo 1.8
Stateful.prototype.forEach = function(callback, thisObject){
	for(var i in this){
		if(this.hasOwnProperty(i) && typeof this[i] != "function"){
			callback.call(thisObject, this[i], i);
		}
	}
};
return declare([List], {
	// summary:
	// 		Add selection capabilities to a grid. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	
	// cellSelection: Boolean
	//		Indicates whether selection should take place at the row level or the cell level.
	cellSelection: false,
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
			listen(this.contentNode, "mousedown,keydown", function(event){
				if(event.type == "mousedown" || event.keyCode == 32){
					event.preventDefault();
					var focusElement = event.target;
					while(focusElement.getAttribute && !focusElement.getAttribute("tabIndex")){
						focusElement = focusElement.parentNode;
					}
					if(focusElement.focus){
						focusElement.focus();
					}
					var cell = grid.cell(event);
					var thisRow = cell && cell.row;
					if(thisRow){
						var targetElement = thisRow.element;
						var selection = grid.selection;
						var id = thisRow.id;
						var columnId = cell && cell.column && cell.column.id;
						if(mode == "single" || (!event.ctrlKey && mode == "extended")){
							grid.clearSelection();
							set(grid, targetElement, id, columnId, true);
						}else{
							set(grid, targetElement, id, columnId, !selection[id]);
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
								set(grid, thisRow.element, thisRow.id, columnId, true);
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
			if(typeof oldValue == "object" || typeof value == "object"){
				for(var colId in oldValue || value){
					updateElement(grid.cell(id, colId).element, value[colId]);
				}
			}else{
				updateElement(grid.row(id).element, value);
			}
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
		set(this, this.row(rowId).element, id, colId, true);
	},
	deselect: function(id, colId){
		set(this, this.row(id).element, id, colId);
	},
	clearSelection: function(){
		this.allSelected = false;
		this.selection.forEach(function(selected, id){
			this.deselect(id);
		}, this);		
	},
	selectAll: function(){
		this.allSelected = true;
		for(var i in this._rowIdToObject){
			var row = this.row(this._rowIdToObject[i]);
			set(this, row.element, row.id, null, true);
		}
	},
	renderArray: function(){
		var rows = this.inherited(arguments);
		for(var i = 0; i < rows.length; i++){
			var row = this.row(rows[i]);
			var selected = this.selection[row.id] || this.allSelected;
			if(selected){
				set(this, rows[i], row.id, selected, true);
			}
		}
		return rows;
	}
});
function updateElement(element, value){
	if(element){
		if(value){
			element.className += " dgrid-selected ui-state-active";
		}else{
			element.className = element.className.replace(/ dgrid-selected ui-state-active/, '');
		}
	}
}
function set(grid, target, rowId, colId, value){
	if(!target || listen.emit(target, value ? "select" : "deselect", {
		cancelable: true,
		bubbles: true,
		id: rowId,
		colId: this.cellSelection && colId
	})){
		var selection = grid.selection;
		var row = selection[rowId];
		if(grid.cellSelection && colId){
			row = row || {};
			row[colId] = value;
		}else{
			row = value;
		}
		grid.selection.set(rowId, row);
		if(!row){
			delete grid.selection[rowId];
		}
	}
}

});