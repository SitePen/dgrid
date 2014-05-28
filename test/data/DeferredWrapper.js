define(["dojo/_base/lang", "dojo/_base/Deferred"],function(lang, Deferred){
	// summary:
	//		Creates a store that wraps the delegate store's query results and total in Deferred
	//		instances. If delay is set, the Deferreds will be resolved asynchronously after delay +/-50%
	//		milliseconds to simulate network requests that may come back out of order.
	return function (store, delay) {
		return lang.delegate(store, {
			fetch: function () {
				if (!this.data || !this.data.then) {
					store.fetch.call(this);

					var actualData = this.data;
					var actualTotal = this.total;

					var resultsDeferred = this.data = new Deferred();
					var totalDeferred = this.total = new Deferred();

					var resolveTotal = function () {
						totalDeferred.resolve(actualTotal);
					};

					var resolveResults = function () {
						resultsDeferred.resolve(actualData);
					};

					if (delay) {
						setTimeout(resolveTotal, delay * (Math.random() + 0.5));
						setTimeout(resolveResults, delay * (Math.random() + 0.5));
					} else {
						resolveTotal();
						resolveResults();
					}
				}
				
				return this.data;
			}
		});
	};
});
