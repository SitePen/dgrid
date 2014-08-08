define([
	'dojo/_base/lang',
	'dojo/Deferred',
	'dstore/QueryResults'
], function (lang, Deferred, QueryResults) {
	// summary:
	//		Creates a store that wraps the delegate store's query results and total in Deferred
	//		instances. If delay is set, the Deferreds will be resolved asynchronously after delay +/-50%
	//		milliseconds to simulate network requests that may come back out of order.
	return function (store, delay) {
		return lang.delegate(store, {
			fetch: function () {
				var actualData = store.fetch.call(this);
				var actualTotal = actualData.totalLength;
				var resultsDeferred = new Deferred();
				var totalDeferred = new Deferred();

				function resolveResults() {
					resultsDeferred.resolve(actualData);
				}
				function resolveTotal() {
					totalDeferred.resolve(actualTotal);
				}

				if (delay) {
					setTimeout(resolveTotal, delay * (Math.random() + 0.5));
					setTimeout(resolveResults, delay * (Math.random() + 0.5));
				} else {
					resolveTotal();
					resolveResults();
				}

				return new QueryResults(resultsDeferred, {
					totalLength: totalDeferred
				});
			},

			fetchRange: function (kwArgs) {
				// dstore/Memory currently handles the data as potentially async
				// but not the length.
				// TODO: Revisit/remove when dstore is always-promise.
				var results = this.fetch();
				return new QueryResults(results.then(function (data) {
					return data.slice(kwArgs.start, kwArgs.end);
				}), {
					totalLength: results.then(function (data) {
						return data.length;
					})
				})
			}
		});
	};
});
