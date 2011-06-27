define(['./create-schema'], 
function(create){
	var list, row;
	with(create){
		list = {
				renderArray: Method("Renders an array in the list. This is the quickest way to get a set of data rendered.", {
					data: Array("The array of data to render. Note that this can also be any object with a forEach method. The object may also have an observe method if the data may be changing in the future.", Object("Each object in the dataset")),
					beforeNode: Object("This can be used to specify where in the list the array should be rendered. Normally this omitted (set to null)."),
					options: Object("Additional settings for the renderer"),
				}, Object("A DOM element with the object rendered within it")),
				on: Method("Add an event listener", {
					target: Object(""),
					event: String(""),
					listener: Method("")
				}),
				row: Method("Returns a row object", {
					target: Union(["object", "string"], "This may be a DOM element, DOM event, or an object id"),
				}, row = Object("Represent a row", {
							id:{description:"The id of the row"},
							data:{description:"The object that was rendered for this row"},
							element:{description:"The DOM element for this row"}
						})),
				refreshContent: Method("Clears the contents of the list component", {}),
				sort: Method("Sorts the list", {
					property: String("The property to sort on"),
					descending: Boolean("Indicates if the sorting should be done in descending order")
				}),
				renderRow: Method("Renders a row in the list. This can be overriden to provide custom rendering for each row. This will be called by the list for each row in the list.", {
						object: Object("The object to render"),
						options: Object("Additional settings for the renderer")
				}, Object("A DOM element with the object rendered within it")),
				renderHeader: Method("Renders a header for the list. This can be overriden to provide custom rendering for the header.", {
					headerNode: Object("The DOM element to render the header into"),
				}),
				cell: Method("Returns a cell object", {
					target: Union(["object", "string"], "This may be a DOM element, DOM event, or an object id"),
					columnId: String("The optional column id for the cell (only needed if the target doesn't disambiguate the cell)")
				}, Object("Represents a cell", {
					row: row,
					column: {description:"The column definition object"},
					element:{description:"The DOM element for this cell"}
				}))
			};
	return Constructor("The List module provides rendering of sets of data as rows, with scrolling capability.", {
			options: Object("Options to be mixed into the list", list),
			element: Union(["string", "object"], "This is the element or element id to attach the grid to")
		}, list);
		
	
	}});