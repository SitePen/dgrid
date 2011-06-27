define(["./create-schema", "./Grid"], 
function(create, Grid){
	var column = Grid.column;
	with(create){
	return Constructor(column, "Defines a column to have expansion capabilities to drill into hierarchical data. This is designed to work with the OnDemandGrid, and the store needs to implement a getChildren() method to support a Tree.");
	}});