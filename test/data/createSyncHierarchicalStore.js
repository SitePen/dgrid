define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"./createSyncStore"
], function(lang, arrayUtil, createSyncStore){

	return function createSyncHierarchicalStore(kwArgs){
		kwArgs = lang.mixin({
			getChildren: function(parent){
				return this.root.filter({ parent: parent.id });
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
