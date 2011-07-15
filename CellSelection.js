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
				this.selection[rowId] = previousRow;
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
			// a range
			if(!toCell.element){
				toCell = this.cell(toCell);
			}
			var toElement = toCell.element;
			var fromElement = cell.element;
			// find if it is earlier or later in the DOM
			var traverser = (toElement && (toElement.compareDocumentPosition ? 
				toElement.compareDocumentPosition(fromElement) == 2 :
				toElement.sourceIndex > fromElement.sourceIndex)) ? "nextSibling" : "previousSibling";
			var idFrom = cell.column.id, idTo = toCell.column.id, started, columnIds = [];
			for(var id in this.columns){
				if(started){
					columnIds.push(id);				
				}
				if(id == idFrom && (idFrom = columnIds) || // once found, we mark it off so we don't hit it again
					id == idTo && (idTo = columnIds)){
					columnIds.push(id);
					if(started || // last id, we are done 
						(idFrom == columnIds && id == idTo)){ // the ids are the same, we are done
						break;
					}
					started = true;
				}
			}
			var row = cell.row, nextNode = row.element;
			toElement = toCell.row.element;
			do{
				// loop through and set everything
				for(var i = 0; i < columnIds.length; i++){
					cell = this.cell(nextNode, columnIds[i]);
					this.select(cell);
				}
				if(nextNode == toElement){
					break;
				}
			}while(nextNode = cell.row.element[traverser]);
		}
	}
});
});