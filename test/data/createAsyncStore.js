define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dstore/Memory',
	'dstore/Observable',
	'dstore/QueryResults'
], function (declare, lang, Deferred, Memory, Observable, QueryResults) {
	// summary:
	//		Creates a store that wraps the delegate store's query results and total in Deferred
	//		instances. If delay is set, the Deferreds will be resolved asynchronously after delay +/-50%
	//		milliseconds to simulate network requests that may come back out of order.
	var AsyncStore = declare(Memory, {
		delay: 200,
		randomizeDelay: false,

		fetch: function () {
			var actualData = this.inherited(arguments);
			var actualTotal = actualData.totalLength;
			var resultsDeferred = new Deferred();
			var totalDeferred = new Deferred();

			function resolveResults() {
				resultsDeferred.resolve(actualData);
			}
			function resolveTotal() {
				totalDeferred.resolve(actualTotal);
			}

			setTimeout(resolveTotal, this.delay * (this.randomizeDelay ? Math.random() + 0.5 : 1));
			setTimeout(resolveResults, this.delay * (this.randomizeDelay ? Math.random() + 0.5 : 1));

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
			});
		}
	});

	var ObservableAsyncStore = declare([ AsyncStore, Observable ]);
	
	return function (kwArgs, Mixin) {
		kwArgs = kwArgs || {};

		if (kwArgs.data) {
			kwArgs = lang.mixin({}, kwArgs, { data: lang.clone(kwArgs.data) });
		}

		var Ctor = Mixin ? declare([ObservableAsyncStore, Mixin]) : ObservableAsyncStore;
		return new Ctor(kwArgs);
	};
});
