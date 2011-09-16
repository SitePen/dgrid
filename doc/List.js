define(['./create-schema'], 
function(create){
	var list, row;
	with(create){
		list = {
				renderArray: Method("Renders an array in the list. This is the quickest way to get a set of data rendered.", {
					data: Array("The array of data to render. Note that this can also be any object with a forEach method. The object may also have an observe method if the data may be changing in the future.", Object("Each object in the dataset")),
					beforeNode: Object("This can be used to specify where in the list the array should be rendered. Normally this is omitted."),
					options: Object("Additional settings for the renderer"),
				}, Object("A DOM element with the object rendered within it")),
				on: Method("Add an event listener to the grid's domNode", {
					event: String("Event type(s) to listen/delegate to (supports same format as dojo/on)"),
					listener: Method("The event handler")
				}),
				row: Method("Returns a row object", {
					target: Union(["object", "string"], "This may be a DOM element, DOM event, or an object id"),
				}, row = Object("Represents a row", {
							id:{description:"The id of the row"},
							data:{description:"The object that was rendered for this row"},
							element:{description:"The DOM element for this row"}
						})),
				refresh: Method("Clears the contents of the list component", {}),
				sort: Method("Sorts the list", {
					property: String("The property to sort on"),
					descending: Boolean("Indicates if sorting should be done in descending order; defaults to false")
				}),
				renderRow: Method("Renders a row in the list. This can be overriden to provide custom rendering for each row. This will be called for each row in the list.", {
						object: Object("The object to render"),
						options: Object("Additional settings for the renderer")
				}, Object("A DOM element with the object rendered within it")),
				renderHeader: Method("Renders a header for the list. This can be overriden to provide custom rendering for the header.", {
					headerNode: Object("The DOM element to render the header into"),
				}),
				cell: Method("Returns a cell object", {
					target: Union(["object", "string"], "This may be a DOM element, DOM event, or an object id")
				}, Object("Represents a cell", {
					row: row
				})),
				domNode: Object("This is the top level element for the list widget"),
				headerNode: Object("This is the element that contains the header"),
				bodyNode: Object("This is the outer scrollbox element that contains the data"),
				contentNode: Object("This is the element that contains the data inside the scrollbox")
			};
	return Constructor("The List module provides rendering of sets of data as rows, with scrolling capability.", {
			options: Object("Options to be mixed into the list", list),
			element: Union(["string", "object"], "This is the element or element id to attach the grid to")
		}, list);
	}});