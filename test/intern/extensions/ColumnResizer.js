define([
	'dojo/_base/declare',
	'dgrid/Grid',
	'dgrid/extensions/ColumnHider',
	'dgrid/extensions/ColumnResizer'
], function (declare, Grid, ColumnHider, ColumnResizer) {
	var test = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;

	test.suite('ColumnResizer', function () {
		var grid;

		test.afterEach(function () {
			if (grid) {
				grid.destroy();
			}
		});

		test.test('subrows with hidden columns', function() {
			var subRows = [ [
				{ field: 'Id', label: 'ID' },
				{ field: 'name', label: 'Name' },
				{ field: 'color', label: 'Color' },
				{ field: 'custom', label: 'hidden column', hidden: true }
			], [
				{ field: 'custom', colSpan: 3 }
			] ];

			assert.doesNotThrow(function () {
				grid = new (declare([ Grid, ColumnResizer, ColumnHider ]))({
					subRows: subRows
				});
			});
		});
	});
});
