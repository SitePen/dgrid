define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"./createSyncStore"
], function(lang, arrayUtil, createSyncStore){

	return function createSyncHierarchicalStore(kwArgs){
		kwArgs = lang.mixin({
			getChildren: function(parent){
				var filteredCollection = this.root.filter({ parent: parent.id });

				// filter and sort the child levels the same way as the root level
				var filterQueries = arrayUtil.filter(this.queryLog, function (entry) {
					return entry.type === 'filter';
				});
				arrayUtil.forEach(filterQueries, function (query) {
					var filterArgs = query.arguments.slice(),
						// copy the filter object so we don't change an existing logged filter
						filter = filterArgs[0] = lang.mixin({}, filterArgs[0]);
					('parent' in filter) && delete filter.parent;
					filteredCollection = filteredCollection.filter.apply(filteredCollection, filterArgs);
				});

				return filteredCollection;
			},
			mayHaveChildren: function(object){
				return object.hasChildren;
			}
		}, kwArgs);

		var store = createSyncStore(kwArgs);
		store.root = store;
		return store.filter({ parent: undefined });
	};
});
