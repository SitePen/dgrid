define(["dojo/_base/declare", "dojo/Stateful", "dojo/listen"], function(declare, Stateful, listen){
return declare([], {
	// summary:
	// 		Add selection capabilities to a table. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	postCreate: function(){
		this.inherited(arguments);
		var lastRow, mode = (this.selectionMode) || "multiple";
		var table = this;
		this.selection = new Stateful();
		if(this.selectionMode != "none"){
			listen(this.contentNode, "mousedown", function(event){
				event.preventDefault();
			});
			listen(this.contentNode, ".dojoxGridxRow:click, .dojoxGridxRow:keydown", function(event){
				if(event.type == "click" || event.keyCode == 32){
					event.preventDefault();
					var thisRow = table.row(event);
					var targetElement = thisRow.element;
					var selection = table.selection;
					var id = thisRow.id;
					if(mode == "single" || (!event.ctrlKey && mode == "multiple")){
						for(var i in selection){
							if(selection.hasOwnProperty(i) && typeof selection[i] != "function"){
								set(table, targetElement, i, false);
							}
						}
						set(table, targetElement, id, true);
					}else{
						set(table, targetElement, id, !selection[id]);
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
							thisRow = table.row(nextNode);
							set(table, thisRow.element, thisRow.id, true);
							if(nextNode == lastElement){
								break;
							}
						}
					}else{
						lastRow = thisRow;
					}
				}
				
			});
		}
		table.selection.watch(function(id, oldValue, value){
			dojo[value ? "addClass" : "removeClass"](table.row(id).element, "dojoxGridxRowSelected");
			dojo[value ? "addClass" : "removeClass"](table.row(id).element, "ui-state-active");
		});
	},
	// selection:
	// 		A stateful object (get/set/watch) where the property names correspond to 
	// 		object ids and values are true or false depending on whether an item is selected
	selection: {},
	select: function(id){
		set(this, this.row(id).element, id, true);
	},
	deselect: function(id){
		set(this, this.row(id).element, id, false);
	},
	renderCollection: function(){
		var rows = this.inherited(arguments);
		for(var i = 0; i < rows.length; i++){
			var row = this.row(rows[i]);
			if(this.selection[row.id]){
				set(this, rows[i], row.id, true);
			}
		}
		return rows;
	}
});
function set(table, target, id, value){
	if(listen.emit(target, value ? "select" : "deselect", {
		cancelable: true,
		bubbles: true,
		id: id
	})){
		table.selection.set(id, value);
	}
}

});