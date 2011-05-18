define(["dojo/_base/declare", "dojo/Stateful", "dojo/listen"], function(declare, Stateful, listen){
return declare([], {
	// summary:
	// 		Add selection capabilities to a grid. The grid will have a selection property and
	//		fire "select" and "deselect" events.
	postCreate: function(){
		this.inherited(arguments);
		var lastRow, mode = this.selectionMode;
		var grid = this;
		this.selection = new Stateful();
		if(this.selectionMode != "none"){
			// this is to stop IE's web accelerator and selection
			listen(this.contentNode, "selectstart", function(event){
				event.preventDefault();
			});
			listen(this.contentNode, ".dojoxGridxRow:mousedown, .dojoxGridxRow:keydown", function(event){
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
					var targetElement = thisRow.element;
					var selection = grid.selection;
					var id = thisRow.id;
					if(mode == "single" || (!event.ctrlKey && mode == "multiple")){
						for(var i in selection){
							if(selection.hasOwnProperty(i) && typeof selection[i] != "function"){
								set(grid, targetElement, i, false);
							}
						}
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
				
			});
		}
		grid.selection.watch(function(id, oldValue, value){
			dojo[value ? "addClass" : "removeClass"](grid.row(id).element, "dojoxGridxRowSelected");
			dojo[value ? "addClass" : "removeClass"](grid.row(id).element, "ui-state-active");
		});
	},
	// selection:
	// 		A stateful object (get/set/watch) where the property names correspond to 
	// 		object ids and values are true or false depending on whether an item is selected
	selection: {},
	// selectionMode: String
	// 		The selection mode to use, can be "multiple", "single", or "extended".
	selectionMode: "multiple",
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
function set(grid, target, id, value){
	if(listen.emit(target, value ? "select" : "deselect", {
		cancelable: true,
		bubbles: true,
		id: id
	})){
		grid.selection.set(id, value);
	}
}

});