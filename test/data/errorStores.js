define([
	'dojo/_base/lang',
	'dojo/Deferred',
	'dstore/Memory',
	'dstore/QueryResults',
	'./typesData'
], function (lang, Deferred, Memory, QueryResults, typesData) {
	// summary:
	//		Returns a hash containing stores which generate errors on specific
	//		methods, synchronously or asynchronously.

	var asyncFetchStore = new Memory(),
		asyncFetchTotalStore = new Memory(),
		asyncPutStore = new Memory({ data: lang.clone(typesData) });

	asyncFetchStore.fetchRange = function () {
		var dfd = new Deferred();
		setTimeout(function () { dfd.reject('Error on async query'); }, 200);
		return new QueryResults(dfd, { totalLength: 0 });
	};

	asyncFetchTotalStore.fetchRange = function () {
		var total = new Deferred();
		total.reject('Error getting the total');
		return new QueryResults([], {
			totalLength: total
		});
	};

	asyncPutStore.put = function () {
		var dfd = new Deferred();
		setTimeout(function () { dfd.reject('Error on async put'); }, 200);
		return dfd.promise;
	};

	return {
		asyncFetch: asyncFetchStore,
		asyncFetchTotal: asyncFetchTotalStore,
		asyncPut: asyncPutStore
	};
});
