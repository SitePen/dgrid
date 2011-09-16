define(["./create-schema", "./List"], 
function(create, List){
	with(create){
	return Constructor(List, 
		"The Selection module can be mixed in to a list or grid to selection capabilities. This module will cause 'select' and 'deselect' events to be fired on the DOM when rows/cells are selected and deselected.",
		{
			cellSelection: Boolean("Indicates that selection should take place at the cell level instead of the row level", false),
			selectionMode: String("Indicates which selection mode to use. The options include 'none' (clicks and keyboard do not select anything, and default browser text selection is available), 'single' (only the last clicked item is selected), 'multiple' (each click adds a selected item, ctrl+click removes), and 'extended' (clicks select last item, but ctrl and shift can be used to select multiple)", "extended"),
			selection: Object("This is an object representing the selected items where the property keys of the object correspond to the object ids of the selected objects. If cell level selection is enabled, each property value will be an object hash with property keys corresponding to the column ids."),
			select: Method("Select an item or items", {
				row: Union(["object", "string"], "Row to select, or row indicating beginning of selection if toRow is also provided.  This may be a DOM element, DOM event, or an object id."),
				toRow: Union(["object", "string"], "Optional; if specified, marks the end of the range (starting at row).  This may be a DOM element, DOM event, or an object id."),
				value: Union(["boolean", "null"], "Indicates action to perform: true selects, false deselects, and null toggles.", true)
			}),
			deselect: Method("Deselect an item or items; equivalent to select(row, toRow, false)", {
				row: Union(["object", "string"], "Row to select, or row indicating beginning of selection if toRow is also provided.  This may be a DOM element, DOM event, or an object id."),
				toRow: Union(["object", "string"], "Optional; if specified, marks the end of the range (starting at row).  This may be a DOM element, DOM event, or an object id.")
			}),
			clearSelection: Method("Deselect all items"),
			selectAll: Method("Select all items")
		});
	}
});