define(["dojo/_base/declare", "./Selection", "dojo/on"], function(declare, Selection, listen){
return declare([Selection], {
	// summary:
	// 		Add cell level selection capabilities to a grid. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	select: function(cell, toCell, value){
		if(value === undefined){
			// default to true
			value = true;
		}
		if(!cell.element){
			cell = this.cell(cell);
		}
		var selection = this.selection;
		var rowId = cell.row.id;
		var previousRow = selection[rowId];
		if(!cell.column){
			for(var i in this.columns){
				this.select(this.cell(rowId, i), null, value);
			}
			return;
		}
		var previous = previousRow && previousRow[cell.column.id];
		if(value === null){
			// indicates a toggle
			value = !previous;
		}
		if(previous != value){
			var element = cell.element;
			if(!element || listen.emit(element, value ? "select" : "deselect", {
				cancelable: true,
				bubbles: true,
				cell: cell
			})){
				previousRow = previousRow || {};
				previousRow[cell.column.id] = value;
				this.selection.set(rowId, previousRow);
				/*if(!row){ // TODO: could check for empty objects to see if it could be deleted
					delete this.selection[rowId];
				}*/
				if(element){
					if(value){
						element.className += " dgrid-selected ui-state-active";
					}else{
						element.className = element.className.replace(/ dgrid-selected ui-state-active/, '');
					}
				}
			}
		}
		if(toCell){
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
	}
});
});