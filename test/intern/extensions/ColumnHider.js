define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dgrid/Grid',
	'dgrid/extensions/ColumnHider'
], function (test, assert, declare, Grid, ColumnHider) {
	var ColumnHiderGrid = declare([ Grid, ColumnHider ]);
	var grid;

	test.suite('ColumnHider', function () {
		test.beforeEach(function () {
			grid = new ColumnHiderGrid({
				columns: {
					col1: 'Column 1',
					col2: {
						label: 'Column 2',
						unhidable: true
					}
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray([]);
		});

		test.afterEach(function () {
			grid.destroy();
		});

		test.suite('#toggleColumnHiddenState', function () {
			test.test('unhidable column', function () {
				assert.doesNotThrow(function () {
					grid.toggleColumnHiddenState('col2');
				});
			});
		});
	});
});