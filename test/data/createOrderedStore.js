define([
	'dojo/_base/lang',
	'./createSyncStore'
], function (lang, createSyncStore) {
	return function createOrderedStore(kwArgs) {
		// dstore already supports ordering w/ beforeId,
		// but add a copy method to test optional feature supported by DnD
		return createSyncStore(lang.mixin({
			copy: function (object, options) {
				// summary:
				//		Given an item already in the store, creates a copy of it.
				//		(i.e., shallow-clones the item sans id, then calls add)

				var newObj = lang.mixin({}, object);
				// Ensure unique ID by removing it from the cloned item
				newObj[this.idProperty] = null;
				return this.add(newObj, options);
			}
		}, kwArgs));
	};
});
