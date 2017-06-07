define([
	'dojo/_base/declare',
	'dojo/when',
	'dstore/Memory'
], function (declare, when, Memory) {
	/**
	 * A memory store that does not create a query log.  Items are always fetched in the order they
	 * exist in the data array.  When this store is sorted, the data items are always rearranged in the data array.
	 */
	return declare([Memory], {
		sort: function () {
			var sorterStore = (new Memory({ data: this.data })).sort.apply(sorterStore, arguments);
			this.setData(sorterStore.fetchSync());
			return this;
		}
	});
});
