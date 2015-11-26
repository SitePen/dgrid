define([
	'intern!tdd',
	'intern/chai!assert',
	'./util',
	'intern/dojo/node!leadfoot/helpers/pollUntil',
	'intern/dojo/node!leadfoot/keys',
	'require'
], function (test, assert, util, pollUntil, keys, require) {
	// The number of visible rows in each grid (clickable without scrolling)
	// Look at the test page to determine this value
	var NUM_VISIBLE_ROWS = 6;

	// The expected select state of each of the first NUM_VISIBLE_ROWS in each
	// table after the first click loop.
	// This could be calculated with a conditional statement, but the logic to so
	// gets a bit tortuous so just lay it out explicitly:
	var expectedSelectState = {
		gridExtended: [1, 0, 1, 0, 1, 0],
		gridSingle: [0, 0, 0, 0, 1, 0]
	};
	expectedSelectState.gridMultiple = expectedSelectState.gridExtended;
	expectedSelectState.gridToggle = expectedSelectState.gridExtended;
	expectedSelectState.gridNone = expectedSelectState.gridExtended;

	test.suite('dgrid/selector functional tests', function () {

		var isShiftClickSupported;

		// Click the checkbox/radio in the first NUM_VISIBLE_ROWS of a grid.
		// After each click the row will be tested for the "dgrid-selected" class.
		function clickAndTestEachRow(remote, gridId) {
			var rowSelector = '#' + gridId + '-row-',
				rowIndex;

			function each(rowIndex) {
				// Click the dgrid/selector checkbox/radio
				return remote.findByCssSelector(rowSelector + rowIndex + ' .field-select input')
						.click()
						.end()
					// Check the row for the "dgrid-selected" class
					.findByCssSelector(rowSelector + rowIndex)
						.getAttribute('class')
						.then(function (classString) {
							var classNames,
								isSelected;

							if (rowIndex % 2) {
								classNames = classString.split(' ');
								isSelected = classNames.indexOf('dgrid-selected') !== -1;
								assert.isFalse(isSelected,
									gridId + ': Row ' + rowIndex + ' should NOT be selected');
							}
							else {
								assert.include(classString, 'dgrid-selected',
									gridId + ': Row ' + rowIndex + ' should be selected after click');
							}
						})
						.end();
			}

			for (rowIndex = 0; rowIndex < NUM_VISIBLE_ROWS; rowIndex++) {
				// The code in this loop is async and might run after the loop has updated
				// rowIndex, so run the code in a function with its own value
				remote = each(rowIndex);
			}

			return remote;
		}

		// Click the checkbox/radio in the first row, then shift+click in the 5th.
		function shiftClickAndTestRows(remote, gridId) {
			var rowSelector = '#' + gridId + '-row-';

			return remote.findByCssSelector(rowSelector + '0' + ' .field-select input')
					.click()
					.end()
				.pressKeys(keys.SHIFT)
				.findByCssSelector(rowSelector + '4' + ' .field-select input')
					.click()
					.pressKeys(keys.NULL)
					.end();
		}

		// Click the "Select All" checkbox in the grid header
		function selectAll(remote, gridId) {
			var selector = '#' + gridId + ' .dgrid-header .field-select input';

			return remote.findByCssSelector(selector)
				.click()
				.end();
		}

		function createRowSelectionTest(gridId, allowMultiple, selectTestFunction) {
			return function () {
				if (selectTestFunction === shiftClickAndTestRows && !isShiftClickSupported) {
					return;
				}

				var selector = '#' + gridId + '-row-',
					remote = this.remote,
					rowIndex;

				function each(rowIndex) {
					return remote.findByCssSelector(selector + rowIndex)
						.getAttribute('class').then(function (classString) {
							var classNames,
								isSelected;

							if (expectedSelectState[gridId][rowIndex]) {
								assert.include(classString, 'dgrid-selected',
									gridId + ': Row ' + rowIndex + ' should still be selected');
							}
							else {
								classNames = classString.split(' ');
								isSelected = classNames.indexOf('dgrid-selected') !== -1;
								assert.isFalse(isSelected,
									gridId + ': Row ' + rowIndex + ' should NOT be selected');
							}
						})
						.end();
				}

				remote = selectTestFunction(remote, gridId);

				// Loop through all rows to verify selection state
				for (rowIndex = 0; rowIndex < NUM_VISIBLE_ROWS; rowIndex++) {
					// The code in this loop is async and might run after the loop has updated
					// rowIndex, so run the code in a function with its own value
					remote = each(rowIndex);
				}

				return remote;
			};
		}

		test.before(function () {
			var remote = this.remote;
			return remote.get(require.toUrl('./Selector.html'))
				.then(pollUntil(function () {
					return window.ready;
				}, null, 5000))
				.then(function () {
					return util.isShiftClickSupported(remote).then(function (isSupported) {
						isShiftClickSupported = isSupported;
						if (!isSupported) {
							console.warn('shift+click tests will be no-ops because ' +
								'this browser/WebDriver combination does not support shift+click.');
						}
					});
				});
		});

		test.beforeEach(function () {
			// Clear selections from previous tests
			return this.remote.execute(function () {
				/* global gridExtended, gridMultiple, gridSingle, gridToggle, gridNone */
				gridExtended.clearSelection();
				gridMultiple.clearSelection();
				gridSingle.clearSelection();
				gridToggle.clearSelection();
				gridNone.clearSelection();
			});
		});

		test.test('selectionMode: extended',
			createRowSelectionTest('gridExtended', true, clickAndTestEachRow));
		test.test('selectionMode: multiple',
			createRowSelectionTest('gridMultiple', true, clickAndTestEachRow));
		test.test('selectionMode: single',
			createRowSelectionTest('gridSingle', false, clickAndTestEachRow));
		test.test('selectionMode: toggle',
			createRowSelectionTest('gridToggle', true, clickAndTestEachRow));
		test.test('selectionMode: none',
			createRowSelectionTest('gridNone', true, clickAndTestEachRow));

		test.test('multiple selection with shift+click; selectionMode: extended',
			createRowSelectionTest('gridExtended', true, shiftClickAndTestRows));
		test.test('multiple selection with shift+click; selectionMode: multiple',
			createRowSelectionTest('gridMultiple', true, shiftClickAndTestRows));
		test.test('multiple selection with shift+click; selectionMode: single',
			createRowSelectionTest('gridSingle', false, shiftClickAndTestRows));
		test.test('multiple selection with shift+click; selectionMode: toggle',
				createRowSelectionTest('gridToggle', true, shiftClickAndTestRows));
		test.test('multiple selection with shift+click; selectionMode: none',
				createRowSelectionTest('gridNone', true, shiftClickAndTestRows));

		test.test('select all; selectionMode: extended',
			createRowSelectionTest('gridExtended', true, selectAll));
		test.test('select all; selectionMode: multiple',
			createRowSelectionTest('gridMultiple', true, selectAll));
		test.test('select all; selectionMode: toggle',
			createRowSelectionTest('gridToggle', true, selectAll));
		test.test('select all; selectionMode: none',
			createRowSelectionTest('gridNone', true, selectAll));

		test.test('keyboard selection on input element', function () {
			function getSelectionState (id) {
				return gridExtended.selection[id];
			}

			return this.remote
				.findByCssSelector('#gridExtended-row-0 input')
					.click()
					.execute(getSelectionState, [ '0' ])
					.then(function (selectionState) {
						assert.isTrue(selectionState, 'Clicked row should be selected');
					})
					.type(keys.ENTER)
					.execute(getSelectionState, [ '0' ])
					.then(function (selectionState) {
						assert.notOk(selectionState, 'Press Enter: row should not be selected');
					})
					.type(keys.ENTER)
					.execute(getSelectionState, [ '0' ])
					.then(function (selectionState) {
						assert.isTrue(selectionState, 'Press Enter: row should be selected');
					})
					.type(keys.SPACE)
					.execute(getSelectionState, [ '0' ])
					.then(function (selectionState) {
						assert.notOk(selectionState, 'Press Space: row should not be selected');
					})
					.type(keys.SPACE)
					.execute(getSelectionState, [ '0' ])
					.then(function (selectionState) {
						assert.isTrue(selectionState, 'Press Space: row should be selected');
					})
				.end();
		});
	});
});
