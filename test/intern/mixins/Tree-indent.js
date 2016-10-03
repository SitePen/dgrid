define([
	'intern!tdd',
	'intern/chai!assert',
	'dgrid/Grid',
	'dgrid/ColumnSet',
	'dgrid/OnDemandGrid',
	'dgrid/Tree',
	'dgrid/extensions/CompoundColumns',
	'dgrid/extensions/SingleQuery',
	'dojo/_base/declare',
	'dojo/query',
	'dgrid/test/data/createHierarchicalStore',
	'dgrid/test/data/hierarchicalCountryData',
	'../addCss!'
], function (test, assert, Grid, ColumnSet, OnDemandGrid, Tree, CompoundColumns, SingleQuery, declare, query,
		createHierarchicalStore, data) {

	test.suite('tree indent', function () {
		var grid;
		var treeIndentWidth = 20;

		test.afterEach(function () {
			if (grid) {
				grid.destroy();
				grid = null;
			}
		});

		function testIndentWidth(id, level) {
			var row = grid.row(id);
			assert.ok(row.element, 'Expected child row exists for ID ' + id);
			query('.dgrid-expando-icon', row.element).forEach(function (element) {
				assert.strictEqual(element.style.marginLeft, treeIndentWidth * level + 'px',
					'Child row should have expected indent width corresponding with indentation level ' + level);
			});
		}

		function level1Test() {
			return grid.expand('AF').then(function () {
				testIndentWidth('EG', 1);
			});
		}

		function level2Test() {
			return grid.expand('AF').then(function () {
				return grid.expand('EG');
			}).then(function () {
				testIndentWidth('Cairo', 2);
			});
		}

		test.suite('OnDemandGrid + tree', function () {
			test.beforeEach(function () {
				grid = new (declare([ OnDemandGrid, Tree ]))({
					collection: createHierarchicalStore({ data: data }),
					treeIndentWidth: treeIndentWidth,
					enableTreeTransitions: false,
					columns: [
						{
							field: 'name',
							label: 'Name',
							renderExpando: true
						},
						{
							field: 'type',
							label: 'Type'
						}, {
							field: 'population',
							label: 'Population'
						}
					]
				});
				document.body.appendChild(grid.domNode);
				grid.startup();
			});

			test.test('level 1', level1Test);
			test.test('level 2', level2Test);

			test.test('refreshCell', function () {
				return grid.expand('AF').then(function () {
					return grid.expand('EG');
				}).then(function () {
					var cell = grid.cell('Cairo', '0');

					return grid.refreshCell(cell).then(level2Test);
				});
			});
		});

		test.suite('OnDemandGrid + tree + compound columns + column sets', function () {
			test.beforeEach(function () {
				grid = new (declare([ OnDemandGrid, Tree, CompoundColumns, ColumnSet ]))({
					collection: createHierarchicalStore({ data: data }),
					treeIndentWidth: treeIndentWidth,
					enableTreeTransitions: false,
					columnSets: [
						[
							[
								{
									field: 'name',
									label: 'Name',
									renderExpando: true
								}
							]
						],
						[
							[
								{
									label: 'Information',
									children: [
										{
											field: 'type',
											label: 'Type'
										}, {
											field: 'population',
											label: 'Population'
										}
									]
								}
							]
						]
					]
				});
				document.body.appendChild(grid.domNode);
				grid.startup();
			});

			test.test('level 1', level1Test);
			test.test('level 2', level2Test);
		});

		test.suite('SingleQuery + Tree', function () {
			var store;

			test.beforeEach(function () {
				store = createHierarchicalStore({ data: [ { id: 1 } ] });
				grid = new (declare([ Grid, SingleQuery, Tree ]))({
					collection: store,
					columns: {
						id: {
							renderExpando: true,
							label: 'ID'
						}
					},
					treeIndentWidth: treeIndentWidth
				});
				document.body.appendChild(grid.domNode);
				grid.startup();
			});

			test.test('Child indentation, both when parent is collapsed and expanded', function () {
				store.addSync({ id: 2, parent: 1 });
				return grid.expand(1).then(function () {
					testIndentWidth(2, 1);
					store.addSync({ id: 3, parent: 1 });
					testIndentWidth(3, 1);
				});
			});

			test.test('refreshCell on parent after a child is rendered', function () {
				store.addSync({ id: 2, parent: 1 });
				return grid.expand(1).then(function () {
					grid.refreshCell(grid.cell(1, 'id'));
					testIndentWidth(1, 0);
				});
			});
		});
	});
});
