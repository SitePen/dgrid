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
				var newStore = this, 
					newResults = [], 
					matchedIds = {}, 
					deferreds = [
					// query for items that match the query, these will go through with any filters on the children
					store.query(lang.mixin({parent: options.parent}, query), options).forEach(function(object){
						// if this object matches the query, we can immediately return it without checking children,
						// and it will be a full object without any filtering applied to it's children
						var id = store.getIdentity(object);
						var index = matchedIds[id];
						// if it was added by the filtered query results below, replace with the full version, otherwise just add it
						newResults.splice(isNaN(index) ? newResults.length : index, 1, object);
						matchedIds[id] = -1;
					})];
				return new QueryResults(Deferred.when(results.forEach(function(object){
					var hasChild;
					var id = store.getIdentity(object);
					
					// check to see if any of the children match the query
					deferreds.push(newStore.getChildren(object, options, query).forEach(function(child){
						// if one of the children matches, we return a modified object that
						// denotes that it doesn't have all it's children, just the ones the match the query
						if(isNaN(matchedIds[id])){ // only add it has not already been added
							matchedIds[id] = newResults.push(lang.delegate({
								_query: query
							}, object)) - 1;
						}
					}));
				}), function(){
					// once done we return the new results as a query results
					return new DeferredList(deferreds).then(function(){
						return newResults;
					});
				}));
			},
			getChildren: function(parent, options, query){
				// overide to use the object's query if it has one
				options.parent = parent.id;
				return this.query(query || parent._query, options);
			},
		});
	};
});