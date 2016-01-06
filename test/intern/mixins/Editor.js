define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/on',
	'dojo/promise/all',
	'dojo/query',
	'dojo/when',
	'dijit/registry',
	'dijit/form/TextBox',
	'dgrid/Grid',
	'dgrid/OnDemandGrid',
	'dgrid/Editor',
	'dgrid/extensions/Pagination',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/orderedData',
	'../addCss!'
], function (test, assert, declare, lang, Deferred, on, all, query, when, registry, TextBox,
		Grid, OnDemandGrid, Editor, Pagination, createSyncStore, orderedData) {

	var testOrderedData = orderedData.items,
		EditorGrid = declare([ Grid, Editor ]),
		grid;

	test.suite('Editor mixin', function () {

		test.afterEach(function () {
			if (grid) {
				grid.destroy();
			}
		});

		test.test('canEdit - always-on (instance-per-row) editor', function () {
			var results = {};
			var data = [
				{id: 1, data1: 'Data 1.a', data2: 'Data 2.a'},
				{id: 2, data1: 'Data 1.b', data2: 'Data 2.b'},
				{id: 3, data1: 'Data 1.c', data2: 'Data 2.c'}
			];
			grid = new EditorGrid({
				columns: [
					{
						field: 'data1',
						label: 'Data 1'
					},
					{
						editor: 'text',
						field: 'data2',
						label: 'Data 2',
						canEdit: function (object, value) {
							results[object.id] = value;
						}
					}
				]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(data);

			assert.strictEqual(results[1], 'Data 2.a',
				'canEdit should have been called (item 1)');
			assert.strictEqual(results[2], 'Data 2.b',
				'canEdit should have been called (item 2)');
			assert.strictEqual(results[3], 'Data 2.c',
				'canEdit should have been called (item 3)');
		});

		test.test('canEdit - editOn (shared) editor', function () {
			var results = {};
			var data = [
				{id: 1, data1: 'Data 1.a', data2: 'Data 2.a'},
				{id: 2, data1: 'Data 1.b', data2: 'Data 2.b'},
				{id: 3, data1: 'Data 1.c', data2: 'Data 2.c'}
			];
			grid = new EditorGrid({
				columns: [
					{
						field: 'data1',
						label: 'Data 1',
						id: 'data1'
					},
					{
						editor: TextBox,
						editOn: 'click',
						field: 'data2',
						label: 'Data 2',
						id: 'data2',
						canEdit: function (object, value) {
							results[object.id] = value;
						}
					}
				]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(data);

			assert.isUndefined(results[1],
				'canEdit should not have been called yet for editOn editor (item 1)');
			assert.isUndefined(results[2],
				'canEdit should not have been called yet for editOn editor (item 2)');
			assert.isUndefined(results[3],
				'canEdit should not have been called yet for editOn editor (item 3)');

			// Note: The "Data 2" column's canEdit method always returns false so none of the following
			// grid.edit calls will return a promise and no editor will receive focus.
			grid.edit(grid.cell(1, 'data2'));
			assert.isUndefined(results[1],
				'canEdit should not have been called yet for editOn editor (item 1)');
			assert.strictEqual(results[2], 'Data 2.b',
				'canEdit should have been called for editOn editor (item 2)');
			assert.isUndefined(results[3],
				'canEdit should not have been called yet for editOn editor (item 3)');

			grid.edit(grid.cell(0, 'data2'));
			assert.strictEqual(results[1], 'Data 2.a',
				'canEdit should have been called for editOn editor (item 1)');
			assert.strictEqual(results[2], 'Data 2.b',
				'canEdit should have been called for editOn editor (item 2)');
			assert.isUndefined(results[3],
				'canEdit should not have been called yet for editOn editor (item 3)');

			grid.edit(grid.cell(2, 'data2'));
			assert.strictEqual(results[1], 'Data 2.a',
				'canEdit should have been called for editOn editor (item 1)');
			assert.strictEqual(results[2], 'Data 2.b',
				'canEdit should have been called for editOn editor (item 2)');
			assert.strictEqual(results[3], 'Data 2.c',
				'canEdit should have been called for editOn editor (item 3)');
		});

		test.test('canEdit always-on editor - suppress on false', function () {
			var rowCount,
				cell,
				matchedNodes,
				dfd = this.async();

			function canEdit(data) {
				return data.order % 2;
			}

			grid = new EditorGrid({
				columns: {
					order: 'step',
					name: {
						editor: 'text',
						label: 'Name',
						canEdit: canEdit
					},
					description: {
						editor: 'text',
						label: 'Description',
						editOn: 'click',
						canEdit: canEdit
					}
				}
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex) {
				cell = grid.cell(rowIndex, 'name');
				when(grid.edit(cell)).then(dfd.rejectOnError(function () {
					matchedNodes = query('input', cell.element);
					if (canEdit(cell.row.data)) {
						assert.strictEqual(1, matchedNodes.length,
							'Cell with canEdit=>true should have an editor element');
					}
					else {
						assert.strictEqual(0, matchedNodes.length,
							'Cell with canEdit=>false should not have an editor element');
					}
					rowIndex++;
					if (rowIndex < rowCount) {
						testRow(rowIndex);
					}
					else {
						dfd.resolve();
					}
				}));
			}
			testRow(0);

			return dfd;
		});

		test.test('canEdit edit-on click editor - suppress on false', function () {
			var rowCount,
				cell,
				matchedNodes,
				dfd = this.async();

			function canEdit(data) {
				return data.order % 2;
			}

			grid = new EditorGrid({
				columns: {
					order: 'step',
					name: {
						editor: 'text',
						label: 'Name',
						canEdit: canEdit
					},
					description: {
						editor: 'text',
						label: 'Description',
						editOn: 'click',
						canEdit: canEdit
					}
				}
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex) {
				cell = grid.cell(rowIndex, 'description');
				when(grid.edit(cell)).then(dfd.rejectOnError(function () {
					matchedNodes = query('input', cell.element);
					if (canEdit(cell.row.data)) {
						assert.strictEqual(1, matchedNodes.length,
							'Cell with canEdit=>true should have an editor element');
					}
					else {
						assert.strictEqual(0, matchedNodes.length,
							'Cell with canEdit=>false should not have an editor element');
					}
					rowIndex++;
					if (rowIndex < rowCount) {
						testRow(rowIndex);
					}
					else {
						dfd.resolve();
					}
				}));
			}
			testRow(0);

			return dfd;
		});

		test.test('destroy editor widgets - native', function () {
			var matchedNodes;

			matchedNodes = query('input');
			assert.strictEqual(0, matchedNodes.length,
				'Before grid is created there should be 0 input elements on the page');

			grid = new EditorGrid({
				columns: {
					order: 'step',
					name: {
						label: 'Name',
						editor: 'text'
					},
					description: {
						label: 'Description',
						editor: 'text',
						editOn: 'click'
					}
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);

			matchedNodes = query('input');
			assert.strictEqual(testOrderedData.length, matchedNodes.length,
					'There should be ' + testOrderedData.length + ' input elements for the grid\'s editors');

			grid.destroy();

			matchedNodes = query('input');
			assert.strictEqual(0, matchedNodes.length,
				'After grid is destroyed there should be 0 input elements on the page');
		});

		test.test('destroy editor widgets - Dijit', function () {
			assert.strictEqual(0, registry.length,
				'Before grid is created there should be 0 widgets on the page');

			grid = new EditorGrid({
				columns: {
					order: 'step',
					name: {
						label: 'Name',
						editor: TextBox
					},
					description: {
						label: 'Description',
						editor: TextBox,
						editOn: 'click'
					}
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);

			// Expected is data length + 1 due to widget for editOn editor
			assert.strictEqual(testOrderedData.length + 1, registry.length,
					'There should be ' + (testOrderedData.length + 1) + ' widgets for the grid\'s editors');

			grid.destroy();

			assert.strictEqual(0, registry.length,
				'After grid is destroyed there should be 0 widgets on the page');
		});

		test.test('editor widget startup called at appropriate time', function () {
			var assertionMessage;
			var AssertionTextBox = declare(TextBox, {
				startup: function () {
					if (this._started) {
						return;
					}
					assert.isTrue(this.domNode.offsetHeight > 0,
						assertionMessage + ': startup should not be called before widgets are in flow');
					this.inherited(arguments);
				}
			});

			grid = new (declare([ OnDemandGrid, Editor ]))({
				columns: {
					order: 'step',
					name: {
						label: 'Name',
						editor: AssertionTextBox
					},
					description: {
						label: 'Description',
						editor: AssertionTextBox,
						editOn: 'click'
					}
				},
				collection: createSyncStore({
					data: testOrderedData,
					idProperty: 'order'
				})
			});
			document.body.appendChild(grid.domNode);

			assertionMessage = 'always-on';
			grid.startup();

			// Assertions will automatically run for always-on editor;
			// test activating an editOn editor and also test updating a row
			assertionMessage = 'editOn + edit()';
			grid.edit(grid.cell(1, 'description'));
			assertionMessage = 'editOn + Trackable';
			grid.collection.put(grid.collection.getSync(2));
		});

		test.test('editor focus with always-on editor', function () {
			var rowCount,
				cell,
				cellEditor,
				dfd = this.async();

			grid = new EditorGrid({
				columns: {
					order: 'step',
					name: {
						label: 'Name',
						editor: 'text'
					},
					description: {
						label: 'Description',
						editor: 'text',
						editOn: 'click'
					}
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex) {
				// Test calling 'grid.edit()' in an always-on cell
				cell = grid.cell(rowIndex, 'name');
				grid.edit(cell).then(dfd.rejectOnError(function (node) {
					cellEditor = query('input', cell.element)[0];
					assert.strictEqual(cellEditor, node,
						'edit method\'s promise should return the active editor');
					assert.strictEqual(cellEditor, document.activeElement,
						'Editing a cell should make the cell\'s editor active');
					rowIndex++;
					if (rowIndex < rowCount) {
						testRow(rowIndex);
					}
					else {
						dfd.resolve();
					}
				}));
			}
			testRow(0);

			return dfd;
		});

		test.test('editor focus and show event with edit-on click editor', function () {
			var rowCount,
				cell,
				cellEditor,
				dfd = this.async();

			grid = new EditorGrid({
				columns: {
					order: 'step',
					name: {
						label: 'Name',
						editor: 'text'
					},
					description: {
						label: 'Description',
						editor: 'text',
						editOn: 'click'
					}
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex) {
				var dfdEvent = new Deferred();
				// Test calling 'grid.edit()' in an always-on cell
				cell = grid.cell(rowIndex, 'description');
				// Respond to the "dgrid-editor-show" event to ensure the
				// correct cell has an editor.  This event actually fires
				// synchronously, so we don't need to use this.async.
				on.once(grid, 'dgrid-editor-show', dfd.rejectOnError(function (event) {
					assert.strictEqual(cell.element, event.cell.element,
						'The activated cell should be being edited'
					);
					dfdEvent.resolve();
				}));
				// Don't move on to the next row until the editor has received focus and the show event has fired.
				all([grid.edit(cell), dfdEvent]).then(dfd.rejectOnError(function () {
					cellEditor = query('input', cell.element)[0];
					assert.strictEqual(cellEditor, document.activeElement,
						'Editing a cell should make the cell\'s editor active');
					rowIndex++;
					if (rowIndex < rowCount) {
						testRow(rowIndex);
					}
					else {
						dfd.resolve();
					}
				}));
			}
			testRow(0);

			return dfd;
		});

		test.test('Maintain shared widgets on refresh in IE', function() {
			grid = new (declare([ OnDemandGrid, Editor ]))({
				columns: {
					name: {
						editor: TextBox,
						editOn: 'click'
					}
				},
				collection: createSyncStore({
					data: testOrderedData,
					idProperty: 'order'
				})
			});
			document.body.appendChild(grid.domNode);
			grid.startup();

			var cell = grid.cell(1, 'name');
			var cellContent;
			return grid.edit(cell).then(function () {
				cellContent = cell.element.innerHTML;
				grid.refresh();
				cell = grid.cell(1, 'name');
				return grid.edit(cell);
			}).then(function () {
				assert.strictEqual(cell.element.innerHTML, cellContent, 'Widget should be identical to before refresh');
			});
		});

		test.suite('Listener cleanup', function () {
			function testCellListeners(rowCount, editorColumnCount) {
				var rowEntryCount = 0;
				for (var rowKey in grid._editorCellListeners) {
					rowEntryCount++;
					var listenerCount = 0;
					var rowCellListeners = grid._editorCellListeners[rowKey];

					for (var cellKey in rowCellListeners) {
						assert.ok(rowCellListeners[cellKey].remove, 'Object in hash should be a listener handle');
						listenerCount++;
					}

					assert.strictEqual(listenerCount, editorColumnCount, 'Should have two listeners per row');
				}
				assert.strictEqual(rowEntryCount, rowCount, 'Should only have one entry for each row');
			}

			function buildPaginatedGrid (GridConstructor, rowsPerPage) {
				var paginatedGrid = new GridConstructor({
					rowsPerPage: rowsPerPage || 10,
					columns: {
						name: {
							editor: 'text',
							editOn: 'click'
						},
						description: {
							editor: 'text',
							editOn: 'click'
						}
					},
					collection: createSyncStore({
						data: testOrderedData,
						idProperty: 'order'
					})
				});

				document.body.appendChild(paginatedGrid.domNode);
				paginatedGrid.startup();
				return paginatedGrid;
			}

			test.test('clean up after refresh cell', function () {
				// Test with Pagination mixed in first
				grid = buildPaginatedGrid(declare([ Grid, Pagination, Editor ]));
				for (var i = 1; i < 10;i ++) {
					grid.refreshCell(grid.cell(i, 'name'));
					grid.refreshCell(grid.cell(i, 'description'));
				}
				testCellListeners(9, 2);
				grid.destroy();

				// Test with Editor mixed in first
				grid = buildPaginatedGrid(declare([ Grid, Editor, Pagination ]));
				for (i = 1; i < 10;i ++) {
					grid.refreshCell(grid.cell(i, 'name'));
					grid.refreshCell(grid.cell(i, 'description'));
				}
				testCellListeners(9, 2);
			});

			test.test('clean up after row is rerendered', function () {
				grid = buildPaginatedGrid(declare([Grid, Pagination, Editor]));
				for (var i = 0; i < 9; i++) {
					grid.collection.put(
						lang.mixin(lang.clone(orderedData.items[i]), {description: 'modified'})
					);
				}
				testCellListeners(9, 2);
			});

			test.test('clean up when switching pages', function () {
				grid = buildPaginatedGrid(declare([Grid, Pagination, Editor]), 5);
				testCellListeners(5, 2);
				grid.gotoPage(2);
				testCellListeners(4, 2);
			});

			test.test('clean up when scrolling', function () {
				var data = [];
				for (var i = 0; i < 1000; i++) {
					data[i] = {
						id: i,
						name: 'Name ' + i
					};
				}
				grid = new (declare([OnDemandGrid, Editor]))({
					columns: {
						name: {
							editor: 'text',
							editOn: 'click'
						}
					},
					minRowsPerPage: 250,
					collection: createSyncStore({
						data: data
					})
				});

				document.body.appendChild(grid.domNode);
				grid.startup();

				testCellListeners(250, 1);
				grid.bodyNode.scrollTop = '10000';
				return when(grid._processScroll(), function () {
					testCellListeners(250, 1);
				});
			});
		});
	});
});
