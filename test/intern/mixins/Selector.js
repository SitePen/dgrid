define([
	'dojo/_base/declare',
	'dojo/query',
	'dgrid/OnDemandGrid',
	'dgrid/Selection',
	'dgrid/Selector',
	'dgrid/test/data/testStore'
], function (declare, query, OnDemandGrid, Selection, Selector, testStore) {
	var tdd = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;

	tdd.suite('selector column plugin', function () {
		var grid;

		tdd.beforeEach(function () {
			grid = new (declare([OnDemandGrid, Selection, Selector]))({
				collection: testStore,
				columns: {
					select: { selector: 'checkbox', label: 'Select' },
					col1: 'Column 1',
					col2: 'Column 2',
					col5: 'Column 5'
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		tdd.afterEach(function () {
			grid.destroy();
		});

		tdd.test('programmatic row selection', function () {
			var rowNode,
				checkboxNode,
				rowCount = testStore.data.length,
				rowIndex = 0,
				expectedSelection = {},
				lastSelectedRow;

			grid.on('dgrid-select, dgrid-deselect', function (event) {
				lastSelectedRow = event.rows[0].id;
			});

			// Test selecting every row in grid
			for (rowIndex = 0; rowIndex < rowCount; rowIndex++) {
				// initialize to invalid value
				lastSelectedRow = -1;

				grid.select(rowIndex);
				expectedSelection[rowIndex] = true;
				assert.deepEqual(grid.selection, expectedSelection,
					'grid.selection object should match expected values');

				rowNode = grid.row(rowIndex).element;
				if (rowNode) {
					// This checks if lastSelectedRow was updated by the event handler for dgrid-select
					// The event is not fired for rows that are not in the DOM, so the test is in this conditional block
					assert.strictEqual(lastSelectedRow, rowIndex,
						'dgrid-select event: last selected row should be ' + rowIndex + '; real: ' + lastSelectedRow);

					// Rows not in the DOM will also not have any checkbox/radio, so only run this test
					// if rowNode exists
					checkboxNode = query('.field-select input', rowNode)[0];
					assert.isTrue(checkboxNode.checked,
						'Checkbox for selected row ' + rowIndex + ' should be checked');
				}
			}

			// Test deselecting every row in grid
			for (rowIndex = 0; rowIndex < rowCount; rowIndex++) {
				// initialize to invalid value
				lastSelectedRow = -1;

				grid.deselect(rowIndex);
				delete expectedSelection[rowIndex];
				assert.deepEqual(grid.selection, expectedSelection,
					'grid.selection object should match expected values');

				rowNode = grid.row(rowIndex).element;
				if (rowNode) {
					// This checks if lastSelectedRow was updated by the event handler for dgrid-deselect
					// The event is not fired for rows that are not in the DOM, so the test is in this conditional block
					assert.strictEqual(lastSelectedRow, rowIndex,
						'dgrid-deselect event: last deselected row should be ' + rowIndex + '; real: ' + lastSelectedRow
					);

					// Rows not in the DOM will also not have any checkbox/radio, so only run this test
					// if rowNode exists
					checkboxNode = query('.field-select input', rowNode)[0];
					assert.isFalse(checkboxNode.checked,
						'Checkbox for selected row ' + rowIndex + ' should NOT be checked');
				}
			}
		});

		tdd.test('Selector#refreshCell', function () {
			grid.select(0);
			var cell = grid.cell(0, 'select');

			return grid.refreshCell(cell).then(function () {
				assert.strictEqual(cell.element.input, query('.field-select input', grid.domNode)[0],
					'Cell element\'s input property should reference re-rendered checkbox');
				assert.strictEqual(cell.element.input.checked, true,
					'Checkbox should be in correct state');
			});
		});
	});
});
