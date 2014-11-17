define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dstore/Memory',
	'dstore/Trackable',
	'dstore/QueryResults'
], function (declare, lang, Deferred, Memory, Trackable, QueryResults) {
	// summary:
	//		Creates a store that wraps the delegate store's query results and total in Deferred
	//		instances. If delay is set, the Deferreds will be resolved asynchronously after delay +/-50%
	//		milliseconds to simulate network requests that may come back out of order.
	var AsyncStore = declare(Memory, {
		delay: 200,
		randomizeDelay: false,

		fetch: function () {
			var actualData = this.fetchSync();
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
			// dstore/Memory#fetchRange always uses fetchSync, which we aren't extending,
			// so we need to extend this as well.

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

	var TrackableAsyncStore = declare([ AsyncStore, Trackable ]);

	return function (kwArgs, Mixin) {
		kwArgs = kwArgs || {};

		if (kwArgs.data) {
			kwArgs = lang.mixin({}, kwArgs, { data: lang.clone(kwArgs.data) });
		}

		var Ctor = Mixin ? declare([TrackableAsyncStore, Mixin]) : TrackableAsyncStore;
		return new Ctor(kwArgs);
	};
});
