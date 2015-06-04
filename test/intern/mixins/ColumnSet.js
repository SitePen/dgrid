define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/Deferred',
	'dojo/on',
	'dojo/query',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/createHierarchicalStore',
	'dgrid/OnDemandGrid',
	'dgrid/ColumnSet',
	'dgrid/Keyboard',
	'dgrid/Tree',
	'dgrid/util/misc',
	'../addCss'
], function (test, assert, declare, aspect, Deferred, on, query, createSyncStore, createHierarchicalStore,
	OnDemandGrid, ColumnSet, Keyboard, Tree, miscUtil) {

	var grid;
	var handles;

	var expand = function (id) {
		var dfd = new Deferred();
		grid.expand(id);
		dfd.resolve();
		return dfd.promise;
	};

	var collapse = function (id) {
		var dfd = new Deferred();
		grid.expand(id, false);
		dfd.resolve();
		return dfd.promise;
	};

	function scrollDistance(node, direction, distance) {
		var dfd = new Deferred(),
			handle;

		handle = on.once(node, 'scroll', miscUtil.debounce(function () {
			dfd.resolve();
		}));

		node[direction === 'x' ? 'scrollLeft' : 'scrollTop'] = distance;

		return dfd.promise;
	}

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
		test.before(function () {
			var TreeColumnSetGrid = declare([ OnDemandGrid, ColumnSet, Tree ]);
			var data = [];
			var store;

			for (i = 0; i < 5; i++) {
				var parentId = '' + i;
				data.push({
					id: parentId,
					value: 'Root ' + i,
					name: 'Root ' + i,
					type: 'country'
				});
				for (k = 0; k < 100; k++) {
					data.push({
						id: i + ':' + k,
						parent: parentId,
						value: 'Child ' + k,
						name: 'Child ' + i,
						type: 'city',
						hasChildren: false
					});
				}
			}

			store = createHierarchicalStore({
				data: data
			});

			grid = new TreeColumnSetGrid({
				collection: store,
				enableTreeTransitions: false,
				columnSets: [[
					[ {renderExpando: true, label:"Name", field:"name", sortable: false} ],
					[ {label:"Type", field:"type", sortable: false} ]
				]]
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(function () {
			for (var i = handles.length; i--;) {
				handles[i].remove();
			}
		});

		test.after(function () {
			grid.destroy();
		});

		test.test('expand after scroll-x should reset scrollLeft', function () {
			var column = query('#' + grid.id + '-row-0 .dgrid-column-set')[0];
			grid.styleColumn('0-0-0', 'width: 10000px; overflow-x: scroll;');

			return expand(0)
				.then(function () {
					collapse(0)
						.then(function () {
							scrollDistance(column, 'x', 300)
								.then(function () {
									expand(0)
										.then(function () {
											assert.strictEqual(column.scrollLeft, 0);
										});
								});
						});
				});
		});
	});
});
