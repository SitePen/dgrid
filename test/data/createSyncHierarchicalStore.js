define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"./createSyncStore"
], function(lang, arrayUtil, createSyncStore){

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
			// TODO: Can we fix this? It isn't very generic.
			mayHaveChildren: function(parent){
				return parent.type != "city";
			}
		}, kwArgs);

		return createSyncStore(kwArgs).filter({ parent: undefined });
	};
});
