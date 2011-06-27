define(["./create-schema", "./List"], 
function(create, List){
	with(create){
	return Constructor(List, 
		"The OnDemandList module renders objects from an object store, using a store's query method and using the store's paging and sorting capabilities for efficiency. This component employs virtual scrolling/paging to pull in data as the list is scrolled.",
		{
			store: Object("The object store that will act as the data provider for the list"),
			query: Union(["string", "object"], "The query to use to query the store"),
			queryOptions: Object("The query options to provide on the queries"),
			minRowsPerPage: Number("The minimum number of rows to page in at once"),
			maxRowsPerPage: Number("The maximum number of rows to page in at once"),
			renderQuery: Method("Render a query in the list view", {
				query: Union(["string", "object"], "The query to use to query the store"),
				beforeNode: Object("Indicate the DOM node to render before")
			}),
			getBeforePut: Boolean("When data is changed, the store will perform a get operation before the put to ensure the latest full copy of data"),
			save: Method("Save any objects that have been modified by the list since the last save")			
		});
	}
});