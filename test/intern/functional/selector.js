define([
	"intern!object",
	"intern/chai!assert",
	"../util",
	"dojo/Deferred",
	"dojo/node!wd/lib/special-keys",
	"require"
], function (test, assert, util, Deferred, specialKeys, require) {
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

	// Click the checkbox/radio in the first NUM_VISIBLE_ROWS of a grid.
	// After each click the row will be tested for the "dgrid-selected" class.
	function clickAndTestEachRow(remote, gridId) {
		var rowSelector = "#" + gridId + "-row-";
		var rowIndex;

		for (rowIndex = 0; rowIndex < NUM_VISIBLE_ROWS; rowIndex++) {
			// The code in this loop is async and might run after the loop has updated
			// rowIndex, so run the code in an IIFE with its own non-closure reference
			(function (rowIndex) {
				// Click the dgrid/selector checkbox/radio
				remote.waitForElementByCssSelector(rowSelector + rowIndex);
				remote.elementByCssSelector(rowSelector + rowIndex + " .field-select input");
				remote.clickElement();
				remote.end();

				// Check the row for the "dgrid-selected" class
				remote.elementByCssSelector(rowSelector + rowIndex);
				remote.getAttribute("class").then(function (classString) {
					var classNames;
					var isSelected;

					if (rowIndex % 2) {
						classNames = classString.split(" ");
						isSelected = classNames.indexOf("dgrid-selected") !== -1;
						assert.isFalse(isSelected, "Row " + rowIndex + " should NOT be selected");
					}
					else {
						assert.include(classString, "dgrid-selected", "Row " + rowIndex + " should be selected after click");
					}
				});
				remote.end();
			}(rowIndex));
		}
	}

	// Click the checkbox/radio in the first row, then shift+click in the 5th.
	function shiftClickAndTestRows(remote, gridId) {
		var rowSelector = "#" + gridId + "-row-";

		remote.waitForElementByCssSelector(rowSelector + "0");
		remote.elementByCssSelector(rowSelector + "0" + " .field-select input");
		remote.clickElement();
		remote.end();
		remote.keys(specialKeys.Shift);
		remote.elementByCssSelector(rowSelector + "4" + " .field-select input");
		remote.clickElement();
		remote.keys(specialKeys.NULL);
		remote.end();
	}

	// Click the "Select All" checkbox in the grid header
	function selectAll(remote, gridId) {
		var selector = "#" + gridId + " .dgrid-header .field-select input";

		remote.waitForElementByCssSelector(selector, 5000);
		remote.elementByCssSelector(selector);
		remote.clickElement();
		remote.end();
	}

	function testRowSelection(gridId, allowMultiple, selectTestFunction) {
		return function () {
			var selector = "#" + gridId + "-row-";
			var remote = this.get("remote");
			var rowIndex;
			var testDfd = this.async();
			var dfd = new Deferred();

			// Check for two conditions to determine if shift+click tests should be run:
			// 1. If the current test involves shift+click (easy, sync test)
			if (selectTestFunction === shiftClickAndTestRows) {
				// 2. If the browser/WebDriver environment supports shift+click (async test)
				util.isShiftClickSupported(remote).then(function () {
					dfd.resolve();
				}).otherwise(function () {
					dfd.reject();
				});
			}
			else {
				dfd.resolve();
			}

			dfd.then(function () {
				selectTestFunction(remote, gridId);

				// Loop through all rows to verify selection state
				for (rowIndex = 0; rowIndex < NUM_VISIBLE_ROWS; rowIndex++) {
					// The code in this loop is async and might run after the loop has updated
					// rowIndex, so run the code in an IIFE with its own non-closure reference
					(function (rowIndex) {
						remote.elementByCssSelector(selector + rowIndex);
						remote.getAttribute("class").then(function (classString) {
							var classNames;
							var isSelected;

							if (expectedSelectState[gridId][rowIndex]) {
								assert.include(classString, "dgrid-selected", "Row " + rowIndex + " should still be selected");
							}
							else {
								classNames = classString.split(" ");
								isSelected = classNames.indexOf("dgrid-selected") !== -1;
								assert.isFalse(isSelected, "Row " + rowIndex + " should NOT be selected");
							}
						});
						remote.end();
					}(rowIndex));
				}

				remote.end();
				remote.then(function () {
					testDfd.resolve();
				});
			}).otherwise(function () {
				console.warn("Skipping shift+click tests because browser/WebDriver combination does not support shift+click.");
				remote.end();
				remote.then(function () {
					testDfd.resolve();
				})
			});

			return testDfd.promise;
		};
	}

	// This "test" simply reloads the page to clear any selection from previous tests
	function refreshPage () {
		this.get("remote").refresh().waitForCondition("ready", 15000);
	}

	return test({
		name: "dgrid/selector",

		before: function () {
			var remote = this.get("remote");
			remote.get(require.toUrl("./selector.html"));
			return remote.waitForCondition("ready", 15000);
		},

		"selectionMode: extended": testRowSelection("gridExtended", true, clickAndTestEachRow),
		"selectionMode: multiple": testRowSelection("gridMultiple", true, clickAndTestEachRow),
		"selectionMode: single"  : testRowSelection("gridSingle", false, clickAndTestEachRow),
		"selectionMode: toggle"  : testRowSelection("gridToggle", true, clickAndTestEachRow),
		"selectionMode: none"    : testRowSelection("gridNone", true, clickAndTestEachRow),

		"refresh page1": refreshPage,

		"multiple selection with shift+click; selectionMode: extended": testRowSelection("gridExtended", true, shiftClickAndTestRows),
		"multiple selection with shift+click; selectionMode: multiple": testRowSelection("gridMultiple", true, shiftClickAndTestRows),
		"multiple selection with shift+click; selectionMode: single"  : testRowSelection("gridSingle", false, shiftClickAndTestRows),
		"multiple selection with shift+click; selectionMode: toggle"  : testRowSelection("gridToggle", true, shiftClickAndTestRows),
		"multiple selection with shift+click; selectionMode: none"    : testRowSelection("gridNone", true, shiftClickAndTestRows),

		"refresh page2": refreshPage,

		"select all; selectionMode: extended": testRowSelection("gridExtended", true, selectAll),
		"select all; selectionMode: multiple": testRowSelection("gridMultiple", true, selectAll),
		"select all; selectionMode: toggle"  : testRowSelection("gridToggle", true, selectAll),
		"select all; selectionMode: none"    : testRowSelection("gridNone", true, selectAll),

		"select all; selectionMode: single": function () {
			var remote = this.get("remote");

			remote.hasElementByCssSelector("#gridSingle .dgrid-header .field-select input");
			remote.then(function (hasSelectAllControl) {
				assert.isFalse(hasSelectAllControl, "Single-select grid should NOT have select all control in header");
			});

			return remote.end();
		}
	});
});
