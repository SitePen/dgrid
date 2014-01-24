define([
	"dojo/_base/lang",
	"./createSyncStore"
], function(lang, createSyncStore){

	return function createSyncHierarchicalStore(kwArgs){
		kwArgs = lang.mixin({
			getChildren: function(parent){
				var filteredCollection = (this.store || this).filter({ parent: parent.id });

				if(this.filtered){
					// filter the child levels the same way as the root level
					arrayUtil.forEach(this.filtered, function(filter){
						filter = lang.mixin({}, filter);
						('parent' in filter) && delete filter.parent;
						filteredCollection = filteredCollection.filter(filter);
					});
				}

				return filteredCollection;
			},
			mayHaveChildren: function(parent){
				return parent.type != "city";
			}
		}, kwArgs);

		var store = createSyncStore(kwArgs);

		var originalFetch = store.fetch;
		store.fetch = function (){
			return originalFetch.call(
				this.filtered
					? this
					: this.filter({ parent: undefined })
			);
		};

		return store;
	};
});
