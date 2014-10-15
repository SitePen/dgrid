define([
	'dstore/Tree',
	'./createSyncStore',
	'./createAsyncStore'
], function (Tree, createSyncStore, createAsyncStore) {
	return function createHierarchicalStore(kwArgs, async) {
		var store = async ? createAsyncStore(kwArgs, Tree) : createSyncStore(kwArgs, Tree);

		return store.filter('mayHaveChildren');
	};
});
