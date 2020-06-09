define([
	'dojo/_base/declare',
	'dgrid/Grid',
	'dgrid/extensions/SingleQuery',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData',
	'dojo/domReady!'
], function (declare, Grid, SingleQuery, createSyncStore, genericData) {
	var tdd = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;
	var SingleQueryGrid = declare([ Grid, SingleQuery ]);
	var grid;

	function getColumns() {
		return {
			id: 'id',
			col1: 'Column 1'
		};
	}

	tdd.suite('SingleQuery', function () {
		var store = createSyncStore({ data: genericData });
		var numItems = store.storage.fullData.length;

		tdd.beforeEach(function () {
			grid = new SingleQueryGrid({
				collection: store,
				columns: getColumns()
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		tdd.afterEach(function () {
			grid.destroy();
		});

		tdd.test('Should render all results at once', function () {
			assert.strictEqual(grid.contentNode.children.length, numItems,
				'A grid row should exist for every item in the collection');
		});

		tdd.test('Should expose total via get(\'total\')', function () {
			assert.strictEqual(grid.get('total'), numItems,
				'grid.get(\'total\') should return total number of items');
		});
	});
});
