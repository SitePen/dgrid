define([
	'dstore/Tree',
	'./createSyncStore',
	'./createAsyncStore'
], function (Tree, createSyncStore, createAsyncStore) {
	return function createHierarchicalStore(kwArgs, async) {
		var store = async ? createAsyncStore(kwArgs, Tree) : createSyncStore(kwArgs, Tree);

		// Override getRootCollection to check for undefined parent rather than null
		store.getRootCollection = function () {
			return this.root.filter({ parent: undefined });
		};
		return store.getRootCollection();
	};
});
