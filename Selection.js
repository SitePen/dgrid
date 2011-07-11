define(["dojo/_base/declare", "dojo/Stateful", "dojo/on", "./List"], function(declare, Stateful, listen, List){
// patch Stateful until Dojo 1.8 so we can do selection.forEach 
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
			listen(this.contentNode, "mousedown,cellfocusin", function(event){
				if(event.type == "mousedown" || !event.ctrlKey || event.keyCode == 32){
					if(event.keyCode == 32){
						event.preventDefault();
					}
/*					var focusElement = event.target;
					while(focusElement.getAttribute && !focusElement.getAttribute("tabIndex")){
						focusElement = focusElement.parentNode;
					}
					if(focusElement.focus){
						focusElement.focus();
					}*/
					var row = grid.row(event);
					if(row){
						var selection = grid.selection;
						if(mode == "single" || (!event.ctrlKey && mode == "extended")){
							grid.clearSelection();
							grid.select(row);
						}else{
							grid.select(row, null, !selection[row.id]);
						}
						if(event.shiftKey && mode != "single"){
							grid.select(lastRow, row);
						}else{
							lastRow = row;
						}
					}
				}
				
			});
		}
		grid.selection.watch(function(id, oldValue, value){
			grid.select(id, null, value);
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
	select: function(row, toRow, value){
		if(value === undefined){
			value = true;
		} 
		if(!row.element){
			row = this.row(row);
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
			return;
		}
		var selection = this.selection;
		var previousValue = selection[row.id];
		if(value != previousValue &&
			(!row.element || listen.emit(row.element, value ? "select" : "deselect", {
			cancelable: true,
			bubbles: true,
			row: row
		}))){
			selection.set(row.id, value);
			if(!value){
				delete this.selection[row.id];
			}
		}
	},
	deselect: function(row, toRow){
		this.select(row, toRow, false);
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
			set(this, row.element, row.id, colId, true);
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
}

});