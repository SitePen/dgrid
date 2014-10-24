define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/query',
	'dgrid/Grid',
	'dgrid/Editor',
	'dgrid/OnDemandGrid',
	'dstore/Memory'
], function (test, assert, declare, query, Grid, Editor, OnDemandGrid, Memory) {

	var PlainEditorGrid = declare([ Grid, Editor ]);
	var OnDemandEditorGrid = declare([ OnDemandGrid, Editor ]);
	var grid;

	test.suite('Grids with Editor mixin - radio editor', function () {

		test.afterEach(function () {
			if (grid) {
				grid.destroy();
			}
		});

		function createData() {
			return [
				{ id: 0, data1: 'text', data2: false },
				{ id: 1, data1: 'text', data2: false },
				{ id: 2, data1: 'text', data2: false }
			];
		}

		function createGrid(Ctor, options) {
			grid = new Ctor(options);
			document.body.appendChild(grid.domNode);
			grid.startup();
		}

		function checkInputs() {
			var inputs = query('.field-data2 .dgrid-input', grid.domNode);
			// Make sure none are checked at first, then click on each one.
			inputs.forEach(function (input) {
				assert.isFalse(input.checked);
				input.click();
			});
			// Make sure the last one is checked after all 3 have been clicked.
			inputs.forEach(function (input, i) {
				if (i === 2) {
					assert.isTrue(input.checked);
				} else {
					assert.isFalse(input.checked);
				}
			});
		}

		test.test('Grid', function () {
			createGrid(PlainEditorGrid, {
				columns: [
					{
						field: 'id',
						label: 'ID'
					},
					{
						editor: 'text',
						field: 'data1',
						label: 'Data 1'
					},
					{
						editor: 'radio',
						field: 'data2',
						label: 'Data 2'
					}
				]
			});
			grid.renderArray(createData());

			checkInputs();

			assert.isFalse(grid.row(0).data.data2);
			assert.isFalse(grid.row(1).data.data2);
			assert.isTrue(grid.row(2).data.data2);
		});

		test.test('OnDemandGrid - autoSave', function () {
			var dfd = this.async(1000);
			var store = new Memory({ data: createData() });
			createGrid(OnDemandEditorGrid, {
				columns: [
					{
						field: 'id',
						label: 'ID'
					},
					{
						editor: 'text',
						field: 'data1',
						label: 'Data 1',
						autoSave: true
					},
					{
						editor: 'radio',
						field: 'data2',
						label: 'Data 2',
						autoSave: true
					}
				],
				collection: store
			});

			checkInputs();

			// Allow the click event to fire.
			setTimeout(dfd.callback(function () {
				assert.isFalse(store.getSync(0).data2);
				assert.isFalse(store.getSync(1).data2);
				assert.isTrue(store.getSync(2).data2);
			}), 0);
		});

		test.test('OnDemandGrid - no autoSave', function () {
			var dfd = this.async(1000);
			var store = new Memory({ data: createData() });
			createGrid(OnDemandEditorGrid, {
				columns: [
					{
						field: 'id',
						label: 'ID'
					},
					{
						editor: 'text',
						field: 'data1',
						label: 'Data 1'
					},
					{
						editor: 'radio',
						field: 'data2',
						label: 'Data 2'
					}
				],
				collection: store
			});

			checkInputs();

			// Allow the click event to fire.
			setTimeout(dfd.rejectOnError(function () {
				assert.isFalse(store.getSync(0).data2);
				assert.isFalse(store.getSync(1).data2);
				assert.isFalse(store.getSync(2).data2);

				grid.save().then(dfd.callback(function () {
					assert.isFalse(store.getSync(0).data2);
					assert.isFalse(store.getSync(1).data2);
					assert.isTrue(store.getSync(2).data2);
				}));
			}), 0);
		});
	});
});
