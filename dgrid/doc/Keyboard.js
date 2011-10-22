define(["./create-schema", "./List"], 
function(create, List){
	with(create){
	return Constructor(List, 
		"The Keyboard module can be mixed in to a list or grid to keyboard navigation capabilities.",
		{
			pageSkip: Number("Indicates the number of rows to move up or down on page up and page down", 10)
		});
	}
});