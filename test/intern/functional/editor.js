define([
	"intern!object",
	"intern/chai!assert",
	"dojo/node!wd/lib/special-keys",
	"require"
], function (test, assert, specialKeys, require) {
	// Number of visible rows in the grid.
	// Check the data loaded in test file (editor.html) and rows visible
	// when the page is loaded to ensure this is correct.
	var GRID_ROW_COUNT = 9;

	function escapeRevertEdit() {
		var remote = this.get("remote");
		var rowSelector = "#grid-row-";
		var rowIndex;

		remote.get(require.toUrl("./editor.html"));
		remote.waitForCondition("ready", 15000);

		for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++ ) {
			(function(rowIndex) {
				var cellSelector = rowSelector + rowIndex + " .field-description";
				var inputSelector = cellSelector + " input";
				var startValue;
				var appendValue = "abc";

				// Click the cell to focus the editor
				remote.waitForElementByCssSelector(cellSelector);
				remote.elementByCssSelector(cellSelector);
				remote.clickElement();
				remote.end();

				// Get the initial value from the editor field
				remote.waitForElementByCssSelector(inputSelector);
				remote.elementByCssSelector(inputSelector);
				remote.getValue();
				remote.then(function (cellValue) {
					startValue = cellValue;
				});

				// Append extra chars and verify the editor's value has updated
				remote.type(specialKeys.End);
				remote.type(appendValue);
				remote.getValue();
				remote.then(function (cellValue) {
					assert.strictEqual(startValue + appendValue, cellValue,
						"Row " + rowIndex + " editor value should equal the starting value plus the appended value"
					);
				});

				// Send Escape and verify the value has reverted in the grid's data
				remote.type(specialKeys.Escape);
				remote.execute("return grid.row(" + rowIndex + ").data.description;");
				remote.then(function (cellValue) {
					assert.strictEqual(startValue, cellValue,
						"Row " + rowIndex + " editor value should equal the starting value after escape"
					);
				});

				remote.end();
			}(rowIndex));
		}

		return remote.end();
	}


	function dgridDatachangeEvent() {
		var remote = this.get("remote");
		var rowSelector = "#grid-row-";
		var rowIndex;

		remote.get(require.toUrl("./editor.html"));
		remote.waitForCondition("ready", 15000);

		// "name" column, always-on editor
		for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
			(function(rowIndex) {
				var cellSelector = rowSelector + rowIndex + " .field-name";
				var otherCellSelector = rowSelector + rowIndex + " .field-description";
				var inputSelector = cellSelector + " input";
				var startValue;
				var appendValue = "abc";

				// Click the cell's editor element to focus it
				remote.waitForElementByCssSelector(inputSelector);
				remote.elementByCssSelector(inputSelector);
				remote.clickElement();

				// Store the current cell value
				remote.getValue();
				remote.then(function (cellValue) {
					startValue = cellValue;
				});

				// Type extra chars to change value
				remote.type(appendValue);
				remote.end();

				// Click another cell to blur the edited cell (and trigger saving and dgrid-datachange event)
				remote.elementByCssSelector(otherCellSelector);
				remote.clickElement();

				// The test page has a dgrid-datachange event listener that will push the new value
				// into a global array: datachangeStack
				remote.execute("return datachangeStack.shift();");
				remote.then(function (datachangeValue) {
					assert.strictEqual(startValue + appendValue, datachangeValue,
						"Value in dgrid-datachange event (" + datachangeValue + ") should equal edited value (" + startValue + appendValue + ")");
				});

				remote.end();
			}(rowIndex));
		}

		// "description" column, click-to-edit
		for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
			(function(rowIndex) {
				var cellSelector = rowSelector + rowIndex + " .field-description";
				var otherCellSelector = rowSelector + rowIndex + " .field-name";
				var inputSelector = cellSelector + " input";
				var startValue;
				var appendValue = "abc";

				// Click the cell to activate the editor
				remote.waitForElementByCssSelector(cellSelector);
				remote.elementByCssSelector(cellSelector);
				remote.clickElement();
				remote.end();

				// Set context to the cell's editor
				remote.elementByCssSelector(inputSelector);

				// Store the current cell value
				remote.getValue();
				remote.then(function (cellValue) {
					startValue = cellValue;
				});

				// Type extra chars to change value
				remote.type(appendValue);
				remote.type(specialKeys.Enter);
				remote.end();

				// The test page has a dgrid-datachange event listener that will push the new value
				// into a global array: datachangeStack
				remote.execute("return datachangeStack.shift();");
				remote.then(function (datachangeValue) {
					assert.strictEqual(startValue + appendValue, datachangeValue,
						"Value in dgrid-datachange event (" + datachangeValue + ") should equal edited value (" + startValue + appendValue + ")");
				});
			}(rowIndex));
		}

		return remote.end();
	}


	function focusOnRefresh() {
		var remote = this.get("remote");
		var rowSelector = "#grid-row-";
		var rowIndex;

		remote.get(require.toUrl("./editor/OnDemandGrid.html"));
		remote.waitForCondition("ready", 15000);

		for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
			(function(rowIndex) {
				var cellSelector = rowSelector + rowIndex + " .field-col4";

				// Click the cell to activate and focus the editor
				remote.waitForElementByCssSelector(cellSelector);
				remote.elementByCssSelector(cellSelector);
				remote.clickElement();
				remote.execute("grid.refresh();")
				remote.waitForCondition("ready", 5000);
				remote.execute("return preRefreshActiveElement === postRefreshActiveElement;");
				remote.then(function (testPassed) {
					assert.isTrue(testPassed,
						"Focused element before refresh should remain focused after refresh");
				});

				remote.end();
			}(rowIndex));
		}

		return remote.end();
	}


	// This test often fails for unknown reasons.
	// Sometimes succeeds, mostly fails (at inconsistent rows).
	// You can see in the console that for some reason although an editor element's DOM "change"
	// event is firing, "dgrid-datachange" is not (and grid.dirty is empty).
	// I have never encountered a failure in manual testing. I've added 1-2 second delays
	// (remote.sleep) in the test sequence to no avail.
	function autoSaveTrue() {
		var remote = this.get("remote");
		var rowSelector = "#grid-row-";
		var appendValue = "abc";

		remote.get(require.toUrl("./editor/OnDemandGrid.html"));
		remote.waitForCondition("ready", 15000);

		for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
			(function(rowIndex) {
				var cellSelector = rowSelector + rowIndex + " .field-col3";
				var otherCellSelector = rowSelector + rowIndex + " .field-col4";
				var inputSelector = cellSelector + " input";
				var editedValue;

				// Click the cell editor and update the value
				remote.waitForElementByCssSelector(inputSelector);
				remote.elementByCssSelector(inputSelector);
				remote.clickElement();
				remote.type(appendValue);
				remote.getValue();
				remote.then(function (cellValue) {
					editedValue = cellValue;
				});
				remote.end();

				// Click another cell to trigger saving of edited cell
				remote.elementByCssSelector(otherCellSelector);
				remote.clickElement();

				// Get the saved value from the test page and verify it
				remote.execute("return gridSaveStack.shift();");
				remote.then(function (savedValue) {
					assert.strictEqual(editedValue, savedValue,
						"Row " + rowIndex + ", column 'col3' saved value (" + savedValue + ") should equal the entered value (" + editedValue + ")");
				});

				// Wait for the save to complete before moving on to next iteration
				remote.waitForCondition("saveComplete", 5000);
				remote.end();
			}(rowIndex));
		}

		return remote.end();
	}


	return test({
		name: "dgrid/editor functional tests",

		"escape reverts edited value": escapeRevertEdit,
		"dgrid-datachange event: always-on": dgridDatachangeEvent,
		"maintain focus on refresh": focusOnRefresh,
		"autoSave: true": autoSaveTrue
	});
});
