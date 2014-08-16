define([
	'dojo/_base/lang',
	'./createSyncStore',
	'./createAsyncStore'
], function (lang, createSyncStore, createAsyncStore) {
	return function createHierarchicalStore(kwArgs, async) {
		kwArgs = lang.mixin({
			getChildren: function (parent) {
				return this.root.filter({ parent: parent.id });
			},
			mayHaveChildren: function (object) {
				return object.hasChildren;
			}
		}, kwArgs);

		var store = async ? createAsyncStore(kwArgs) : createSyncStore(kwArgs);
		store.root = store;
		return store.filter({ parent: undefined });
	};
});
