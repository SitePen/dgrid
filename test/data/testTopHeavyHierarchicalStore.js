define([
	'dstore/Tree',
	'./createSyncStore',
	'./stateData',
	'dojo/_base/array'
], function (Tree, createSyncStore, stateData, arrayUtil) {

	var nextId = 0;
	var topHeavyData = arrayUtil.map(stateData.items, function (state) {
		return {
			id: nextId++,
			abbreviation: state.abbreviation,
			name: state.name,
			hasChildren: true,
			parent: null
		};
	});

	// Store with few children and many parents to exhibit any
	// issues due to bugs related to total disregarding level
	arrayUtil.forEach(topHeavyData, function (state) {
		topHeavyData.push({
			id: nextId++,
			abbreviation: 'US',
			name: 'United States of America',
			hasChildren: false,
			parent: state.id
		});
	});

	return createSyncStore({ data: topHeavyData }, Tree).getRootCollection();
});
