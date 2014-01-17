define([
	"dojo/_base/Deferred",
	"./createSyncStore"
], function(Deferred, createSyncStore){
	return function createAsyncStore(kwArgs){
		var store = createSyncStore(kwArgs),
			syncFetch = store.fetch;

		store.fetch = function asyncFetch() {
			var results = syncFetch.apply(this, arguments),
				def = new Deferred(function(){
					clearTimeout(timer);
				}),
				timer = setTimeout(function(){
					def.resolve(results);
				}, 200);
			return def.promise;
		};

		return store;
	};
});
