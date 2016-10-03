define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dgrid/Grid',
	'dgrid/extensions/SingleQuery',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData',
	'dojo/domReady!'
], function (test, assert, declare, Grid, SingleQuery, createSyncStore, genericData) {
	var grid;
	var SingleQueryGrid = declare([ Grid, SingleQuery ]);

	function getColumns() {
		return {
			id: 'id',
			col1: 'Column 1'
		};
	}

	test.suite('SingleQuery', function () {
		var store = createSyncStore({ data: genericData });
		var numItems = store.storage.fullData.length;

		test.beforeEach(function () {
			grid = new SingleQueryGrid({
				collection: store,
				columns: getColumns()
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(function () {
			grid.destroy();
		});

		test.test('Should render all results at once', function () {
			assert.strictEqual(grid.contentNode.children.length, numItems,
				'A grid row should exist for every item in the collection');
		});

		test.test('Should expose total via get(\'total\')', function () {
			assert.strictEqual(grid.get('total'), numItems,
				'grid.get(\'total\') should return total number of items');
		});
	});
});
