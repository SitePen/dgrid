define(["./create-schema", "./Grid"], 
function(create, Grid){
	var column = Grid.column;
	with(create){
	return Constructor(column, "Defines a column with editing capabilities", {
			editor: Union(["function", "string"], "This can be a Dijit widget (constructor) to use as the editor for the cells in the column, or it can be an input type (like checkbox, radio, or text) to use as the editor."),
			editOn: String("This is an optional event type to trigger the editor in the cell. If this is not provided then the editor is always on. Typical event types to trigger an editor would be 'dblclick', 'click', or 'focus'.")	
		});
	}});