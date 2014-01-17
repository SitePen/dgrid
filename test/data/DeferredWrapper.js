define(["dojo/_base/lang", "dojo/_base/Deferred"],function(lang, Deferred){
	// summary:
	//		Creates a store that wraps the delegate store's query results and total in Deferred
	//		instances. If delay is set, the Deferreds will be resolved asynchronously after delay +/-50%
	//		milliseconds to simulate network requests that may come back out of order.
	return function(store, delay){
		return lang.delegate(store, {
			fetch: function(){
				var totalDeferred = new Deferred();
				var resultsDeferred = new Deferred();
				resultsDeferred.total = totalDeferred;

				var results = store.fetch.call(this);
				var resolveTotal = function(){
					totalDeferred.resolve(this.total);
				};
				var resolveResults = function(){
					resultsDeferred.resolve(results);
				};

				if(delay){
					setTimeout(resolveTotal, delay * (Math.random() + 0.5));
					setTimeout(resolveResults, delay * (Math.random() + 0.5));
				}
				else{
					resolveTotal();
					resolveResults();
				}

				return resultsDeferred;
			}
		});
	}
});
