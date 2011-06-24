define([], 
function(){
	var list, row;
	return {
		description:"The List module provides rendering of sets of data as rows, with scrolling capability.",
		type: "function",
		returns: list = {
			description: "A List component",
			methods: {
				renderArray: {
					description: "Renders an array in the list. This is the quickest way to get a set of data rendered.",
					parameters: [
						{name: "data", type:["array"], description: "The array of data to render. Note that this can also be any object with a forEach method. The object may also have an observe method if the data may be changing in the future."},
						{name: "beforeNode", type:["object"], description: "This can be used to specify where in the list the array should be rendered. Normally this omitted (set to null)."},
						{name: "options", type:["object"], description: "Additional settings for the renderer"}
					],
					returns: {
						description: "A DOM element with the object rendered within it"
					}
				},
				on: {
					description: "Add an event listener",
					parameters: [
						{name: "target", type:"object"},
						{name: "event", type:"string"},
						{name: "listener", type:"function"}
					]
				},
				row: {
					description: "Returns a row object",
					parameters: [
						{name: "target", type:["object", "string"], description: "This may be a DOM element, DOM event, or an object id"}
					],
					returns: row = {
						properties: {
							id:{description:"The id of the row"},
							data:{description:"The object that was rendered for this row"},
							element:{description:"The DOM element for this row"}
						}
					}
				},
				refreshContent: {
					description: "Clears the contents of the list component",
					parameters: [
					]
				},
				sort: {
					description: "Sorts the list",
					parameters: [
						{name: "property", type:["string"], description: "The property to sort on"},
						{name: "descending", type:["boolean"], description: "Indicates if the sorting should be done in descending order"}
					]
				},
				renderRow: {
					description: "Renders a row in the list. This can be overriden to provide custom rendering for each row. This will be called by the list for each row in the list.",
					parameters: [
						{name: "object", type:["object"], description: "The object to render"},
						{name: "options", type:["object"], description: "Additional settings for the renderer"}
					],
					returns: {
						description: "A DOM element with the object rendered within it"
					}
				},
				cell: {
					description: "Returns a cell object",
					parameters: [
						{name: "target", type:["object", "string"], description: "This may be a DOM element, DOM event, or an object id"},
						{name: "columnId", type:["string"], required: false, description: "The column id for the cell (only needed if the target doesn't disambiguate the cell)"}
					],
					returns: {
						properties: {
							row: row,
							column: {description:"The column definition object"},
							element:{description:"The DOM element for this cell"}
						}
					}
				}
			}
		},
		parameters: [
			{
				name: "Options",
				description: "Options to be mixed into the list",
				type: "object"/*,
				properties: list.properties*/
			},
			{
				name: "element",
				type: ["string", "object"],
				description: "This is the element or element id to attach the grid to"
			}
		]
		
	};});