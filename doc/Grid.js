define(["./create-schema", "./List"], 
function(create, List){
	with(create){
	var column = Object("Column definition", {
		field: String("The property from the data objects to retrieve for display in this column"),
		name: String("The label to use in the column header"),
		sortable: Boolean("The property from the data objects to retrieve for display in this column"),
		className: String("The CSS classname to apply to the DOM element for the cells in this column"),
		id: String("The column id"),
		renderCell: Method("This function can be provided to provide custom rendering of the cells in this column",{
			object: Object("This is the object to be rendered for this row"), 
			value: Union("", "This is the value to render"),
			cell: Object("This is the DOM element for the cell to render into"),
			options: Object("Additional options for the rendering")
		}),
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
	return Grid;});