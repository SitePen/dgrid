define([
	'intern!tdd',
	'intern/chai!assert',
	'./util',
	'intern/dojo/node!leadfoot/helpers/pollUntil',
	'intern/dojo/node!leadfoot/keys',
	'require'
], function (test, assert, util, pollUntil, keys, require) {
	// Number of visible rows in the grid.
	// Check the data loaded in test file (Editor.html) and rows visible
	// when the page is loaded to ensure this is correct.
	var GRID_ROW_COUNT = 3;
	var rowSelectorPrefix = '#grid-row-';

	var EditorCommand = util.createCommandConstructor({
		dismissViaEnter: function () {
			// Presses the enter key and ends the current element context.
			return new this.constructor(this, function () {
				return this.parent.type(keys.ENTER);
			});
		},
		dismissViaBlur: function () {
			// Exits to the parent context and focuses an unrelated element.
			return new this.constructor(this, function () {
				return this.parent.end()
					.findByTagName('h2')
					.click();
			});
		}
	});

	test.suite('dgrid/editor functional tests', function () {
		var gotoEnd; // Function defined when `before` logic runs

		// Functions performing operations to test the editor columns in the grid,
		// passed to createDatachangeTest

		function testAlwaysOnEditor(command, rowIndex, dismissFunc) {
			// Turn off whitespace check because it doesn't like [dismissFunc]() on its own line
			/* jshint white: false */
			var startValue,
				appendValue = 'abc';

			// Click the cell's editor element to focus it
			command = command.findByCssSelector(rowSelectorPrefix + rowIndex + ' .field-name input')
					.click()
					// Store the current cell value
					.getProperty('value')
					.then(function (cellValue) {
						startValue = cellValue;
					});
			// Type extra characters to change value
			return gotoEnd(command)
					.type(appendValue)
					[dismissFunc]()
					.end()
				// Click another cell to blur the edited cell (and trigger saving and dgrid-datachange event)
				.findByCssSelector(rowSelectorPrefix + rowIndex + ' .field-description')
					.click()
					// The test page has a dgrid-datachange event listener that will push the new value
					// into a global array: datachangeStack
					.execute('return datachangeStack.shift();')
					.then(function (datachangeValue) {
						assert.strictEqual(startValue + appendValue, datachangeValue,
							'Value in dgrid-datachange event (' + datachangeValue +
								') should equal edited value (' + startValue + appendValue + ')');
					})
					.end();
		}

		function testEditOnEditor(command, rowIndex, dismissFunc) {
			// Turn off whitespace check because it doesn't like [dismissFunc]() on its own line
			/* jshint white: false */

			var cellSelector = rowSelectorPrefix + rowIndex + ' .field-description',
				startValue,
				appendValue = 'abc';

			// Click the cell to activate the editor
			command = command.findByCssSelector(cellSelector)
					.click()
					.end()
				// Set context to the cell's editor
				.findByCssSelector(cellSelector + ' input')
					// Store the current cell value
					.getProperty('value')
					.then(function (cellValue) {
						startValue = cellValue;
					});
			// Type extra characters to change value
			return gotoEnd(command)
					.type(appendValue)
					[dismissFunc]()
					.end()
				// The test page has a dgrid-datachange event listener that will push the new value
				// into a global array: datachangeStack
				.execute('return datachangeStack.shift();')
				.then(function (datachangeValue) {
					assert.strictEqual(startValue + appendValue, datachangeValue,
						'Value in dgrid-datachange event (' + datachangeValue +
							') should equal edited value (' + startValue + appendValue + ')');
				});
		}

		function createDatachangeTest(testFunc, dismissFunc, initFunction) {
			// Generates test functions for enter/blur value registration tests
			return function () {
				this.async(60000);
				var command = new EditorCommand(this.remote);

				command = command.get(require.toUrl('./Editor.html'))
					.then(pollUntil(function () {
						return window.ready;
					}, null, 5000));

				if (initFunction) {
					command = command.execute(initFunction);
				}

				for (var rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
					command = testFunc(command, rowIndex, dismissFunc);
				}

				return command;
			};
		}

		function createFocusTest(selector, initFunction) {
			// Generates test functions for focus preservation tests
			return function () {
				var command = new EditorCommand(this.remote),
					rowIndex;

				function each(rowIndex) {
					// Click the cell to activate and focus the editor
					return command.findByCssSelector(rowSelectorPrefix + rowIndex + ' ' + selector)
							.click()
							.end()
						.executeAsync(function (id, rowIdPrefix, done) {
							/* global grid */
							function getRowId(node) {
								// Retrieves ID of row based on an input node
								while (node && node.id.slice(0, 9) !== rowIdPrefix) {
									node = node.parentNode;
								}
								return node && node.id;
							}

							var activeId = getRowId(document.activeElement);
							grid.collection.emit('update', { target: grid.collection.get(id) });
							// Need to wait until next turn for refocus
							setTimeout(function () {
								done(activeId === getRowId(document.activeElement));
							}, 0);
						}, [ rowIndex, rowSelectorPrefix.slice(1) ])
						.then(function (testPassed) {
							assert.isTrue(testPassed,
								'Focused element before refresh should remain focused after refresh');
						})
						.findByTagName('h2')
							.click()
							.end();
				}

				command = command.get(require.toUrl('./Editor-OnDemand.html'))
					.then(pollUntil(function () {
						return window.ready;
					}, null, 5000));

				if (initFunction) {
					command = command.execute(initFunction);
				}

				for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
					command = each(rowIndex);
				}

				return command;
			};
		}

		function createEscapeRevertTest(initFunction) {
			return function () {
				var command = new EditorCommand(this.remote),
					rowIndex;

				function each(rowIndex) {
					var cellSelector = rowSelectorPrefix + rowIndex + ' .field-description',
						startValue,
						appendValue = 'abc';

					// Click the cell to focus the editor
					var newCommand = command.findByCssSelector(cellSelector)
							.click()
							.end()
						// Get the initial value from the editor field
						.findByCssSelector(cellSelector + ' input')
							.getProperty('value')
							.then(function (cellValue) {
								startValue = cellValue;
							});

					// Append extra chars and verify the editor's value has updated
					return gotoEnd(newCommand)
							.type(appendValue)
							.getProperty('value')
							.then(function (cellValue) {
								assert.notStrictEqual(startValue, cellValue,
									'Row ' + rowIndex + ' editor value should differ from the original');
							})
							// Send Escape and verify the value has reverted in the grid's data
							.type(keys.ESCAPE)
							.execute('return grid.row(' + rowIndex + ').data.description;')
							.then(function (cellValue) {
								assert.strictEqual(startValue, cellValue,
									'Row ' + rowIndex + ' editor value should equal the starting value after escape');
							})
							.end();
				}

				command = command.get(require.toUrl('./Editor.html'))
					.then(pollUntil(function () {
						return window.ready;
					}, null, 5000));

				if (initFunction) {
					command = command.execute(initFunction);
				}

				for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
					command = each(rowIndex);
				}

				return command;
			};
		}

		function createAutosaveTest(initFunction) {
			return function () {
				var command = new EditorCommand(this.remote),
					appendValue = 'abc',
					rowIndex;

				function each(rowIndex) {
					var editedValue;

					// Click the cell editor and update the value
					var newCommand = command.findByCssSelector(rowSelectorPrefix + rowIndex + ' .field-name input')
							.click();
					return gotoEnd(newCommand)
							.type(appendValue)
							.getProperty('value')
							.then(function (cellValue) {
								editedValue = cellValue;
							})
							.dismissViaBlur()
							.end()
						// Click elsewhere to trigger saving of edited cell
						.findByTagName('h2')
							.click()
							.end()
						// Wait for the save to complete before moving on to next iteration
						.then(pollUntil(function () {
							return window.saveComplete;
						}, null, 5000))
						// Get the saved value from the test page and verify it
						.execute('return gridSaveStack.shift();')
						.then(function (savedValue) {
							assert.strictEqual(editedValue, savedValue,
								'Row ' + rowIndex + ', column "name" saved value (' + savedValue +
									') should equal the entered value (' + editedValue + ')');
						});
				}

				command = command.get(require.toUrl('./Editor-OnDemand.html'))
					.then(pollUntil(function () {
						return window.ready;
					}, null, 5000));

				if (initFunction) {
					command = command.execute(initFunction);
				}

				for (rowIndex = 0; rowIndex < GRID_ROW_COUNT; rowIndex++) {
					command = each(rowIndex);
				}

				return command;
			};
		}

		// Function passed to above functions to change grid column structure
		// to test other types of editors

		function setTextBox() {
			/* global setEditorToTextBox */
			setEditorToTextBox();
		}

		test.before(function () {
			// In order to function properly on all platforms, we need to know
			// what the proper character sequence is to go to the end of a text field.
			// End key works generally everywhere except Mac OS X.
			return util.isInputHomeEndSupported(this.remote).then(function (isSupported) {
				gotoEnd = isSupported ? function (command) {
					return command.type(keys.END);
				} : function (command) {
					return command.type(keys.META + keys.ARROW_RIGHT);
				};
			});
		});

		test.test('escape reverts edited value', createEscapeRevertTest());
		test.test('escape reverts edited value - TextBox', createEscapeRevertTest(setTextBox));

		// This combination works, though it's debatable whether it even should
		test.test('enter registers edited value for always-on editor',
			createDatachangeTest(testAlwaysOnEditor, 'dismissViaEnter'));

		test.test('enter registers edited value for editOn editor',
			createDatachangeTest(testEditOnEditor, 'dismissViaEnter'));

		test.test('blur registers edited value for always-on editor',
			createDatachangeTest(testAlwaysOnEditor, 'dismissViaBlur'));

		test.test('blur registers edited value for always-on editor - TextBox',
			createDatachangeTest(testAlwaysOnEditor, 'dismissViaBlur', setTextBox));

		test.test('blur registers edited value for editOn editor',
			createDatachangeTest(testEditOnEditor, 'dismissViaBlur'));

		test.test('blur registers edited value for editOn editor - TextBox',
			createDatachangeTest(testEditOnEditor, 'dismissViaBlur', setTextBox));

		test.test('maintain focus on update for always-on editor',
			createFocusTest('.field-name input'));

		test.test('maintain focus on update for always-on editor - TextBox',
			createFocusTest('.field-name input', setTextBox));

		test.test('maintain focus on update for editOn editor',
			createFocusTest('.field-description'));

		test.test('maintain focus on update for editOn editor - TextBox',
			createFocusTest('.field-description', setTextBox));

		test.test('autoSave: true', createAutosaveTest());
		test.test('autoSave: true - TextBox', createAutosaveTest(setTextBox));

		test.test('shared editor reset', function () {
			return this.remote
				.get(require.toUrl('./Editor.html'))
				.then(pollUntil(function () {
					return window.ready;
				}, null, 5000))
				.execute(function () {
					/* global setEditorToValidationTextBox, data */
					setEditorToValidationTextBox();
					data[1].description = '';
					data[2].description = '';
					grid.refresh();
					grid.renderArray(data);
				})
				.findByCssSelector('#grid-row-1 .field-description')
					.click()
					.end()
				.findByCssSelector('#grid-row-2 .field-description')
					.click()
					.findByCssSelector('.dijitInputInner')
						.getAttribute('aria-invalid')
						.then(function (isInvalid) {
							assert.notStrictEqual(isInvalid, 'true',
								'Cell editor validation state should not carry over into newly active cell editor');
							})
						.end()
					.end();
		});
	});
});
