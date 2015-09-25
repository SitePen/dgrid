define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dgrid/OnDemandGrid',
	'dgrid/Tree',
	'dstore/Memory'
], function (test, assert, declare, Grid, Tree, Memory) {
	var TreeGrid = declare([ Grid, Tree ]);
	var grid;
	var collection;

	test.suite('ColumnReorder', function () {
		test.beforeEach(function () {
			collection = new Memory({
				data: [ {
					col1: 'val',
					col2: 'val'
				} ]
			});
			grid = new TreeGrid({
				columns: {
					col1: {
						label: 'Column 1',
						renderExpando: true
					},
					col2: 'Column 2'
				},
				collection: collection
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(function () {
			grid.destroy();
		});

		test.suite('#configureTreeColumn', function () {
			test.test('renderingExpando', function () {
				assert.strictEqual(grid.domNode.querySelectorAll('.dgrid-expando-icon').length, 1,
					'Should have rendered one expando icon');

				grid._configureTreeColumn(grid.get('columns').col1);

				grid.refresh();

				assert.strictEqual(grid.domNode.querySelectorAll('.dgrid-expando-icon').length, 1,
					'Should not have rendered another expando icon');
			});
		});
	});
});