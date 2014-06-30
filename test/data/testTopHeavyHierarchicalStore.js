define([
	"./createSyncStore",
	"./stateData",
	"dojo/_base/array"
], function(createSyncStore, stateData, arrayUtil){

	var nextId = 0;
	var topHeavyData = arrayUtil.map(stateData.items, function (state) {
		return {
			id: nextId++,
			abbreviation: state.abbreviation,
			name: state.name,
			children: [{
				id: nextId++,
				abbreviation: 'US',
				name: 'United States of America'
			}]
		};
	});

	// Store with few children and many parents to exhibit any
	// issues due to bugs related to total disregarding level
	return createSyncStore({
		data: topHeavyData,
		getChildren: function(parent, options){
			return this._createSubCollection({
				data: parent.children,
				total: parent.children.length
			});
		},
		mayHaveChildren: function(parent){
			return !!parent.children;
		}
	});
});
