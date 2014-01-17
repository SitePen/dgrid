define([
	"./createSyncStore"
], function(createSyncStore){

	var testTopHeavyData = arrayUtil.map(testStateStore.data, function (state) {
		return {
			abbreviation: state.abbreviation,
			name: state.name,
			children: [{
				abbreviation: 'US',
				name: 'United States of America'
			}]
		};
	});

	// Store with few children and many parents to exhibit any
	// issues due to bugs related to total disregarding level
	return function createTopHeavyHierarchicalStore(){
		return createSyncStore({
			data: testTopHeavyData,
			idProperty: "abbreviation",
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
	};
});
