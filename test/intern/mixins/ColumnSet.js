define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/query',
	'dgrid/test/data/createSyncStore',
	'dgrid/OnDemandGrid',
	'dgrid/ColumnSet'
], function (test, assert, declare, query, createSyncStore, OnDemandGrid, ColumnSet) {
	var grid;
	var syncStore;

	test.suite('Grids with Selector mixin', function () {
		test.afterEach(function () {
			grid.destroy();
		});

		test.beforeEach(function () {
			var columnSetGrid = declare([ OnDemandGrid, ColumnSet ]);
			var data = [
				{ id: 1, column1: 'Column 1', column2: 'Column 2', column3: 'Column 3' },
				{ id: 2, column1: 'Column 1', column2: 'Column 2', column3: 'Column 3' },
				{ id: 3, column1: 'Column 1', column2: 'Column 2', column3: 'Column 3' }
			];

			syncStore = createSyncStore({ data: data });
			grid = columnSetGrid({
				collection: syncStore,
				columnSets: [
					[
						[
							{ field: 'column1', label: 'Column 1' }
						]
					],
					[
						[
							{ field: 'column2', label: 'Column 2' }
						]
					],
					[
						[
							{ field: 'column3', label: 'Column 3' }
						]
					]
				]
			});
			document.body.appendChild(grid.domNode);
			grid.styleColumnSet('0', 'width: 200px;');
			grid.styleColumnSet('1', 'width: 200px;');
			grid.styleColumn('0-0-0', 'width: 1000px');
			grid.startup();
		});

		test.test('Grid - Scroll right', function () {
			var columnSets = query('.dgrid-column-set-0 [data-dgrid-column-set-id="0"]');
			grid._scrollColumnSet(grid, columnSets[0], 1000);
			syncStore.putSync({
				id: 1,
				column1: 'Column 1 Mod', 
				column2: 'Column 2 Mod',
				column3: 'Column 3 Mod'
			});
			columnSets.forEach(function (element) {
				assert.strictEqual(element.scrollLeft, 0, 'scroll left property is equal');
			});
		});
	});
});