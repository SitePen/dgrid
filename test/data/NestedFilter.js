// example sample data and code
define(["dojo/_base/lang", "dojo/store/util/QueryResults", "dojo/_base/Deferred", "dojo/DeferredList"],
function(lang, QueryResults, Deferred, DeferredList){
	return function(store){
		// summary:
		//		Creates a store that applies a query to a hierarchical data structure,
		//		returning objects where objects or object descendants match the query
		return lang.delegate(store, {
			query: function(query, options){
				// query for everything with the right parent
				var results = store.query({parent: options.parent}, options);
				// if there no query, return everything
				if(!query){
					return results;
				}
				var parent =options.parent;
				var newStore = this, newResults = [], deferreds = [];
				return new QueryResults(Deferred.when(results.forEach(function(object){
					if(store.queryEngine(query)([object]).length > 0){
						// if this object matches the query, we can immediately return it without checking children,
						// and it will be a full object without any filtering applied to it's children
						newResults.push(object);
					}else{
						var hasChild;
						// check to see if any of the children match the query
						deferreds.push(newStore.getChildren(object, options, query).forEach(function(child){
							// if one of the children matches, we return a modified object that
							// denotes that it doesn't have all it's children, just the ones the match the query
							if(!hasChild){
								newResults.push(lang.delegate(object, {
									_query: query
								}));
								hasChild = true;
							}
						}));
					}
				}), function(){
					// once done we return the new results as a query results
					return new DeferredList(deferreds).then(function(){
						return newResults;
					});
				}));			
			},
			getChildren: function(parent, options, query){
				options.parent = parent.id;
				return this.query(query || parent._query, options);
			},
		});
	};
});