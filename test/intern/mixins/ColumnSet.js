define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/Deferred',
	'dojo/query',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/createHierarchicalStore',
	'dgrid/OnDemandGrid',
	'dgrid/ColumnSet',
	'dgrid/Keyboard',
	'dgrid/Tree',
	'../addCss!'
], function (test, assert, declare, aspect, Deferred, query, createSyncStore, createHierarchicalStore,
		OnDemandGrid, ColumnSet, Keyboard, Tree) {

	var grid;
	var handles;

	test.suite('ColumnSet mixin', function () {
		test.before(function () {
			var ColumnSetGrid = declare([ OnDemandGrid, Keyboard, ColumnSet ]);
			grid = new ColumnSetGrid({
				columnSets: [
					[
						[
							{ field: 'column1', label: 'Column 1' }
						]
					],
					[
						[
							{ field: 'column2', label: 'Column 2' },
							{ field: 'column3', label: 'Column 3' }
						]
					]
				]
			});

			// Give the grid a specific width (as well as its columns) so that
			// expected behaviors occur regardless of browser window dimensions
			grid.domNode.style.width = '1000px';
			grid.styleColumnSet('0', 'width: 400px;');
			grid.styleColumn('1-0-0', 'width: 300px;');
			grid.styleColumn('1-0-1', 'width: 1000px;');
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.beforeEach(function () {
			var data = [];
			handles = [];

			for (var i = 0; i < 3; i++) {
				data.push({ id: i + 1, column1: 'Column 1', column2: 'Column 2', column3: 'Column 3' });
			}

			grid.set('collection', createSyncStore({ data: data }));
		});

		test.afterEach(function () {
			for (var i = handles.length; i--;) {
				handles[i].remove();
			}
		});

		test.after(function () {
			grid.destroy();
		});

		test.test('Re-inserted rows should maintain previous column set scroll positions', function () {
			var dfd = this.async(1000);
			var scrollAmount = 250;

			function assertScroll(messageSuffix) {
				var element = query('.dgrid-column-set-1 [data-dgrid-column-set-id="1"]', grid.row(1).element)[0];
				assert.strictEqual(element.scrollLeft, scrollAmount,
					'Column Set scrollLeft should equal ' + scrollAmount + messageSuffix);
			}

			handles.push(aspect.after(grid, '_onColumnSetScroll', dfd.callback(function () {
				assertScroll(' before put');
				grid.collection.putSync(grid.collection.getSync(1));
				assertScroll(' after put');
			})));

			grid._scrollColumnSet('1', scrollAmount);
		});

		test.test('Horizontal scroll caused by cell focus should remain synchronized', function () {
			var dfd = this.async(1000);

			handles.push(aspect.after(grid, '_onColumnSetScroll', dfd.callback(function () {
				var element = query('.dgrid-column-set-1 [data-dgrid-column-set-id="1"]', grid.row(1).element)[0];
				assert.isTrue(element.scrollLeft > 0,
					'Column Set 1 should have scrolled in response to right cell being focused');
			})));

			grid.focus(grid.cell(1, '1-0-1'));
		});
	});

	test.suite('ColumnSet + Tree mixins', function () {
		test.beforeEach(function () {
			var TreeColumnSetGrid = declare([ OnDemandGrid, ColumnSet, Tree ]);
			var data = [];

			for (var i = 0; i < 5; i++) {
				var parentId = '' + i;
				data.push({
					id: parentId,
					name: 'Root ' + i
				});
				for (var k = 0; k < 5; k++) {
					data.push({
						id: i + ':' + k,
						parent: parentId,
						name: 'Child ' + k,
						hasChildren: false
					});
				}
			}

			var store = createHierarchicalStore({
				data: data
			});

			grid = new TreeColumnSetGrid({
				collection: store,
				enableTreeTransitions: false,
				columnSets: [ [
					[ { renderExpando: true, label: 'Name', field: 'name', sortable: false } ]
				] ]
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(function () {
			for (var i = handles.length; i--;) {
				handles[i].remove();
			}
			grid.destroy();
		});

		test.test('re-expand after horizontal scroll should restore correct scrollLeft', function () {
			var scrollAmount = 250;
			grid.styleColumn('0-0-0', 'width: 10000px;');

			return grid.expand(0, true).then(function () {
				return grid.expand(0, false);
			}).then(function () {
				var scrollDfd = new Deferred();
				handles.push(aspect.after(grid, '_onColumnSetScroll', function () {
					scrollDfd.resolve();
				}));

				grid._scrollColumnSet('0', scrollAmount);
				return scrollDfd.promise;
			}).then(function () {
				return grid.expand(0, true);
			}).then(function () {
				var element = query('.dgrid-column-set-0 [data-dgrid-column-set-id="0"]',
					grid.row('0:0').element)[0];

				assert.strictEqual(element.scrollLeft, scrollAmount,
					'Column Set should have expected scroll position for re-expanded rows');
			});
		});
	});
});
