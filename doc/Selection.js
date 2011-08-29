define(["./create-schema", "./List"], 
function(create, List){
	with(create){
	return Constructor(List, 
		"The Selection module can be mixed in to a list or grid to selection capabilities. This module will cause 'select' and 'deselect' events to be fired on the DOM when rows/cells are selected and deselected.",
		{
			cellSelection: Boolean("Indicates that selection should take place at the cell level instead of the row level", false),
			selectionMode: String("Indicates which selection mode to use. The options include 'none' (clicks and keyboard do not select anything), 'single' (only the last clicked item is selected), 'multiple' (each click adds a selected item), and 'extended' (clicks select last item, but ctrl and shift can be used to select multiple)", "extended"),
			selection: Object("This is an object representing the selected items where the property keys of the object correspond to the object ids of the selected objects. One can watch() the selected object to monitor for changes to the selected set. If cell level selection is enabled, each property value will be an object hash with property keys corresponding to the column ids."),
			select: Method("Select an item", {
				id: String("Id of the object to select"),
				columnId: String("This argument (it is optional) may be included to indicate which cell in a row to select (otherwise the whole row is selected)")
			}),
			deselect: Method("Select an item", {
				id: String("Id of the object to deselect"),
				columnId: String("This argument (it is optional) may be included to indicate which cell in a row to deselect (otherwise the whole row is deselected)")
			}),
			clearSelection: Method("Deselect everything item"),
			selectAll: Method("Select everything item")
		});
	}
});