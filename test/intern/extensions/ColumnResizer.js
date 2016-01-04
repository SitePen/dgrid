define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dgrid/Grid',
	'dgrid/extensions/ColumnHider',
	'dgrid/extensions/ColumnResizer'
], function (test, assert, declare, Grid, ColumnHider, ColumnResizer) {

	test.suite('ColumnResizer', function () {
		test.test('subrows with hidden columns', function() {
			var subRows = [ [
				{ field: 'Id', label: 'ID' },
				{ field: 'name', label: 'Name' },
				{ field: 'color', label: 'Color' },
				{ field: 'custom', label: 'hidden column', hidden: true }
			], [ { field: "custom", colSpan: 3 } ] ];

			assert.doesNotThrow(function () {
				var grid = new (declare([ Grid, ColumnResizer, ColumnHider ]))({
						subRows: subRows
					}
				);
				document.body.appendChild(grid.domNode);
				grid.startup();
				grid.renderArray([]);
			});
		});
	});
});