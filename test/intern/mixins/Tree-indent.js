define([
	'intern!tdd',
	'intern/chai!assert',
	'dgrid/ColumnSet',
	'dgrid/OnDemandGrid',
	'dgrid/Tree',
	'dgrid/extensions/CompoundColumns',
	'dojo/_base/declare',
	'dojo/query',
	'dgrid/test/data/createHierarchicalStore',
	'dgrid/test/data/hierarchicalCountryData',
	'../addCss!'
], function (test, assert, ColumnSet, OnDemandGrid, Tree, CompoundColumns, declare, query,
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
			assert.ok(row.element, 'Expected child row exists');
			query('.dgrid-expando-icon', row.element).forEach(function (element) {
				assert.strictEqual(element.style.marginLeft, treeIndentWidth * level + 'px');
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
	});
});
