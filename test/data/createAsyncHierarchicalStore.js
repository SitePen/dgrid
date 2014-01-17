define([
	"./createSyncHierarchicalStore",
	"./DeferredWrapper"
], function(createSyncHierarchicalStore, DeferredWrapper){
	return function createAsyncHierarchicalStore(kwArgs){
		return new DeferredWrapper(createSyncHierarchicalStore(kwArgs));
	};
});
