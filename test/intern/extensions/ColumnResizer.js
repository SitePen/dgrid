define([
	'intern!tdd',
	'dojo/_base/declare',
	'dgrid/Grid',
	'dgrid/extensions/ColumnHider',
	'dgrid/extensions/ColumnResizer'
], function (test, declare, Grid, ColumnHider, ColumnResizer) {

	test.suite('ColumnResizer', function () {
		test.test('subrows with hidden columns', function() {
			var subRows = [ [
				{ field: 'Id', label: 'ID' },
				{ field: 'name', label: 'Name' },
				{ field: 'color', label: 'Color' },
				{ field: 'custom', label: 'hidden column', hidden: true }
			], [ { field: "custom", colSpan: 3 } ] ];

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