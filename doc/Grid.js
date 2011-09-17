define(["./create-schema", "./List"], 
function(create, List){
	with(create){
	var column = Object("Column definition", {
		field: String("The property to retrieve from the data objects for display in this column"),
		label: String("The label to display in the column header"),
		sortable: Boolean("Controls whether clicking in the column header will sort the grid by this column; defaults to true"),
		className: String("A CSS className to apply to the DOM element for the cells in this column"),
		id: String("The column id"), // TODO: document default
		renderCell: Method("This function can be specified to provide custom rendering of the cells in this column.",{
			object: Object("This is the object to be rendered for this row"),
			value: Union("", "This is the value to render"),
			cell: Object("This is the DOM element for the cell to render into"),
			options: Object("Additional options for the rendering")
		}, Union("", "The DOM node to be rendered within the cell.")),
		get: Method("This function can define custom retrieval of a value from the object. This useful for columns that may be an aggregate or computed value from the object for the row", {
			object: Object("The object for the row")
		}, Union("", "The value to be rendered")),
		formatter: Method("This function can provide custom stringification of the value for the cell in HTML form. Normally values are HTML-escaped to avoid security exploits from data that injects malicious HTML/code. However, the formatter output is not HTML-escaped, allowing for custom HTML tags in a cell.", {
			value: Object("The value to be rendered")
		}, String("The HTML string to be displayed in the column (will be set to the innerHTML of the cell)")),
		renderHeaderCell: Method("This function can be provided to provide custom rendering of the header cell  in this column",{
			cell: Object("This is the DOM element for the header to render into")
		})
	});
	column.name = "Column";
	var Grid = Constructor(List, 
		"The grid module provides rendering of sets of data in tabular format with scrolling capability.",
		{
			column: Method("Retrieve a column object", {
				target: Union(["string", "object"], "A DOM element, event, or the column id of the column to retrieve.")
			}, column),
			styleColumn: Method("Applies CSS style to a particular column", {
				columnId: String("Column id"), 
				cssText: String("CSS text to apply as the style")
			}),
			columns: Hash("Set of columns defining how the data is to be rendered in tabular form", column),
			cellNavigation: Boolean("Indicates if the nagivation (keyboard/focus) should \
					take place at cell level instead of the row level", true)
		});
	};
	Grid.column = column;
	return Grid;
});
