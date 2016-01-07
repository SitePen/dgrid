define([
	'intern!tdd',
	'intern/chai!assert',
	'dgrid/OnDemandGrid',
	'dgrid/Editor',
	'dgrid/Tree',
	'dgrid/util/misc',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/aspect',
	'dojo/Deferred',
	'dojo/dom-class',
	'dojo/dom-construct',
	'dojo/dom-style',
	'dojo/on',
	'dojo/query',
	'dgrid/test/data/createHierarchicalStore',
	'../addCss!'
], function (test, assert, OnDemandGrid, Editor, Tree, miscUtil, declare, lang, aspect, Deferred,
		domClass, domConstruct, domStyle, on, query, createHierarchicalStore) {

	var grid,
		testDelay = 15;

	function createGrid(options, setStoreAfterStartup) {
		var data = [],
			store,
			treeColumnOptions,
			i,
			k,
			GridConstructor;

		for (i = 0; i < 5; i++) {
			var parentId = '' + i;
			data.push({
				id: parentId,
				value: 'Root ' + i
			});
			for (k = 0; k < 100; k++) {
				data.push({
					id: i + ':' + k,
					parent: parentId,
					value: 'Child ' + k,
					hasChildren: false
				});
			}
		}

		store = createHierarchicalStore({
			data: data
		});

		treeColumnOptions = lang.mixin({
			renderExpando: true,
			label: 'id',
			field: 'id'
		}, options && options.treeColumnOptions);

		if (options && options.useEditor) {
			GridConstructor = declare([OnDemandGrid, Editor, Tree]);
			if (!treeColumnOptions.editor) {
				treeColumnOptions.editor = 'text';
			}
		}
		else {
			GridConstructor = declare([OnDemandGrid, Tree]);
		}

		grid = new GridConstructor(lang.mixin({
			sort: 'id',
			collection: setStoreAfterStartup ? null : store,
			columns: [
				treeColumnOptions,
				{ label: 'value', field: 'value'}
			],
			enableTreeTransitions: false
		}, options && options.gridOptions));
		document.body.appendChild(grid.domNode);
		grid.startup();

		if (setStoreAfterStartup) {
			grid.set('collection', store);
		}
	}

	function destroyGrid() {
		grid.destroy();
		grid = null;
	}

	function testRowExists(dataItemId, exists) {
		// Tests existence of a row for a given item ID;
		// if `exists` is false, tests for nonexistence instead
		exists = exists !== false;
		assert[exists ? 'isNotNull' : 'isNull'](document.getElementById(grid.id + '-row-' + dataItemId),
				'A row for ' + dataItemId + ' should ' + (exists ? '' : 'not ') + 'exist in the grid.');
	}

	function wait(delay) {
		// Returns a promise resolving after the given number of ms (or testDelay by default)
		var dfd = new Deferred();
		setTimeout(function () {
			dfd.resolve();
		}, delay || testDelay);
		return dfd.promise;
	}

	function scrollToEnd() {
		var dfd = new Deferred(),
			handle;

		handle = on.once(grid.bodyNode, 'scroll', miscUtil.debounce(function () {
			dfd.resolve();
		}));

		grid.scrollTo({ y: grid.bodyNode.scrollHeight });

		return dfd.promise;
	}

	test.suite('Tree', function () {

		function makeBeforeEach(setStoreAfterStartup) {
			return function () {
				createGrid({}, setStoreAfterStartup);

				// Firefox in particular seems to skip transitions sometimes
				// if we don't wait a bit after creating and placing the grid
				return wait();
			};
		}

		test.suite('configure store last', function () {

			test.beforeEach(makeBeforeEach(true));

			test.afterEach(destroyGrid);

			test.test('expand first row', function () {
				return grid.expand(0)
					.then(function () {
						testRowExists('0:0');
						testRowExists('0:99', false);
					});
			});

			test.test('expand last row', function () {
				return grid.expand(4).then(function () {
					testRowExists('4:0');
					testRowExists('4:99', false);
				});
			});
		});

		test.suite('large family expansion', function () {

			test.beforeEach(makeBeforeEach());

			test.afterEach(destroyGrid);

			test.test('expand first row', function () {
				return grid.expand(0)
					.then(function () {
						testRowExists('0:0');
						testRowExists('0:99', false);
					});
			});

			test.test('expand first row + scroll to bottom', function () {
				return grid.expand(0)
					.then(scrollToEnd)
					.then(function () {
						testRowExists('0:0');
						testRowExists('0:99');
					});
			});

			test.test('expand last row', function () {
				return grid.expand(4).then(function () {
					testRowExists('4:0');
					testRowExists('4:99', false);
				});
			});

			test.test('expand last row + scroll to bottom', function () {
				return grid.expand(4)
					.then(scrollToEnd)
					.then(function () {
						testRowExists('4:0');
						testRowExists('4:99');
					});
			});

			test.test('expand first and last rows + scroll to bottom', function () {
				return grid.expand(0)
					.then(scrollToEnd)
					.then(function () {
						return grid.expand(4);
					})
					.then(scrollToEnd)
					.then(function () {
						testRowExists('4:0');
						testRowExists('4:99');
					});
			});

			test.test('expand hidden', function () {
				var dfd = this.async(1000);

				grid.domNode.style.display = 'none';
				grid.expand(0);
				grid.domNode.style.display = 'block';

				// Since the grid is not displayed the expansion will occur without a transitionend event
				// However, DOM updates from the expand will not complete within the current stack frame
				setTimeout(dfd.callback(function () {
					var connected = grid.row(0).element.connected;
					assert.isTrue(connected && connected.offsetHeight > 0,
						'Node should be expanded with non-zero height');
				}), 0);
			});

			// Test goal: ensure the expando icon is displayed consistent with the results of the store's
			// "mayHaveChildren" method.
			// Notes:
			// * The store created in "createGrid" has a "mayHaveChildren" that returns true for nodes with no parentId
			// * The expando icon (.dgrid-expando-icon) is always rendered, it is not visible if it lacks the class
			//   ".ui-icon"
			test.test('mayHaveChildren', function () {
				var rowObject;
				var expandoNode;
				var i;
				var j;

				for (i = 0; i < 5; i++) {
					rowObject = grid.row(i);
					expandoNode = query('.dgrid-expando-icon.ui-icon', rowObject.element)[0];
					assert.isDefined(expandoNode, 'Parent node should have an expando icon; node id = ' + i);

					grid.expand(i, true, true);

					for (j = 0; j < 2; j++) {
						rowObject = grid.row(i + ':' + j);
						expandoNode = query('.dgrid-expando-icon.ui-icon', rowObject.element)[0];
						assert.isUndefined(expandoNode,
								'Child node should not have an expando icon; node id = ' + i + ':' + j);
					}

					grid.expand(i, false, true);
				}
			});

			// Test goal: ensure that rows are correctly expanded/collapsed on grid render in accordance with the
			// grid's "shouldExpand" method
			test.test('shouldExpand', function () {
				var shouldExpand;
				var i;

				grid.shouldExpand = function (rowObject) {
					var shouldExpand = false;

					if (rowObject.data.parent === undefined) {
						shouldExpand = rowObject.id % 2 === 0;
					}

					return shouldExpand;
				};
				grid.refresh();

				for (i = 0; i < 5; i++) {
					shouldExpand = i % 2 === 0;

					if (shouldExpand) {
						assert.isTrue(grid._expanded[i], 'Row ' + i + ' should be expanded');
					}
					else {
						assert.isUndefined(grid._expanded[i], 'Row ' + i + ' should not be expanded');
					}
				}
			});

			// Test goal: ensure that a custom "renderExpando" column method produces the expected DOM structure
			test.test('renderExpando', function () {
				var columns;
				var rowObject;
				var expandoNode;
				var i;

				columns = grid.get('columns');
				columns[0].renderExpando = function () {

					// * Adds the "test-expando" class
					// * Floats the expando at the opposite end of the cell
					var node = grid._defaultRenderExpando.apply(this, arguments);
					domClass.add(node, 'test-expando');
					domStyle.set(node, 'float', 'right');
					return node;
				};
				grid.set('columns', columns);

				for (i = 0; i < 5; i++) {
					rowObject = grid.row(i);
					expandoNode = query('.dgrid-expando-icon.ui-icon', rowObject.element)[0];
					assert.isDefined(expandoNode, 'Row ' + i + ' should have an expando icon');
					assert.include(expandoNode.className, 'test-expando',
							'Row ' + i + '\'s expando icon should have the class "test-expando"');
				}
			});

			// Test goal: ensure the expando node is still rendered when the column has a custom "renderCell" method
			test.test('renderCell', function () {
				var rowObject;
				var expandoNode;
				var i;

				grid.destroy();

				createGrid({
					treeColumnOptions: {
						renderCell: function (object, value) {
							var div = domConstruct.create('div', { className: 'testRenderCell' });
							div.appendChild(document.createTextNode(value));
							return div;
						}
					}
				});

				for (i = 0; i < 5; i++) {
					rowObject = grid.row(i);
					expandoNode = query('.dgrid-expando-icon.ui-icon', rowObject.element)[0];
					assert.isDefined(expandoNode, 'Row ' + i + ' should have an expando node');
				}

				grid.destroy();

				createGrid({
					treeColumnOptions: {
						renderCell: function (rowObject, cellValue, cellNode) {
							domClass.add(cellNode, 'testRenderCell');
							cellNode.appendChild(document.createTextNode(cellValue));
						}
					}
				});

				for (i = 0; i < 5; i++) {
					rowObject = grid.row(i);
					expandoNode = query('.dgrid-expando-icon.ui-icon', rowObject.element)[0];
					assert.isDefined(expandoNode, 'Row ' + i + ' should have an expando node');
				}
			});

			// Test goal: ensure the expando node is still rendered with the editor plugin
			// Note: ordering is important: tree(editor()), not editor(tree())
			test.test('renderCell with editor', function () {
				var rowObject;
				var expandoNode;
				var inputNode;
				var i;

				grid.destroy();

				createGrid({
					useEditor: true
				});

				for (i = 0; i < 5; i++) {
					rowObject = grid.row(i);
					expandoNode = query('.dgrid-expando-icon.ui-icon', rowObject.element)[0];
					assert.isDefined(expandoNode, 'Row ' + i + ' should have an expando node');
					inputNode = query('.dgrid-input', rowObject.element)[0];
					assert.isDefined(inputNode, 'Row ' + i + ' should have an input node');
				}
			});

			// Test goal: ensure renderCell does not get re-wrapped over itself if the same column definition object
			// is received during a column reset (e.g. via ColumnReorder).  See #1157
			test.test('renderCell after same structure is recomputed', function () {
				function countRowExpandos() {
					return grid.row('0').element.querySelectorAll('.dgrid-expando-icon').length;
				}

				assert.strictEqual(countRowExpandos(), 1, 'Each parent row should have one expando icon');
				grid.set('columns', grid.get('columns'));
				assert.strictEqual(countRowExpandos(), 1, 'Each parent row should still have only one expando icon');
			});
		});

		test.suite('large family expansion without sort', function () {
			test.beforeEach(function () {
				createGrid({ gridOptions: { sort: null } });
				return wait();
			});

			test.afterEach(destroyGrid);

			test.test('expand first row', function () {
				return grid.expand(0)
					.then(function () {
						testRowExists('0:0');
						var row = grid.row('0:0').element;
						assert.strictEqual(row.previousSibling.className, 'dgrid-preload',
							'Item 0:0 should be the first item even with no sort order specified');
					});
			});
		});

		test.suite('Tree + Trackable', function () {
			test.beforeEach(createGrid);
			test.afterEach(destroyGrid);

			test.test('child modification', function () {
				return grid.expand(0).then(function () {
					testRowExists('0:0');
					assert.doesNotThrow(function () {
						grid.collection.putSync({
							id: '0:0',
							value: 'Modified',
							parent: '0'
						});
					}, null, 'Modification of child should not throw error');
				});
			});

			test.test('child modification after parent when expanded', function () {
				return grid.expand(0).then(function () {
					grid.collection.putSync({
						id: '0',
						value: 'Modified'
					});
					grid.collection.putSync({
						id: '0:0',
						value: 'Modified',
						parent: '0',
						hasChildren: false
					});
					grid.collection.putSync({
						id: '0',
						value: 'Modified'
					});
					assert.strictEqual(grid.row('0').element, grid.domNode.querySelector('.dgrid-row'),
						'Expected first row to be the first row in the dom');
				});
			});

			test.test('collapse items removed from store', function () {
				return grid.expand(0).then(function () {
					assert.isTrue(domClass.contains(grid.row(0).element, 'dgrid-row-expanded'),
						'Should have expanded class');
					var item = grid.collection.getSync(0);
					grid.collection.remove(0);
					grid.collection.addSync(item);
					assert.isFalse(domClass.contains(grid.row(0).element, 'dgrid-row-expanded'),
						'Should not preserve expanded status after removing from store');
				});
			});
		});

		test.suite('Tree + Trackable + shouldTrackCollection: false', function () {
			var handles = [];

			test.beforeEach(function () {
				createGrid({
					gridOptions: {
						shouldTrackCollection: false
					}
				});
			});

			test.afterEach(function () {
				for (var i = handles.length; i--;) {
					handles[i].remove();
				}
				handles = [];
				destroyGrid();
			});

			test.test('child add', function () {
				return grid.expand(0).then(function () {
					testRowExists('0:0');
					grid.collection.add({
						id: '0:0.5',
						value: 'New',
						parent: '0'
					});
					testRowExists('0:0.5', false);
				});
			});

			test.test('child put', function () {
				return grid.expand(0).then(function () {
					var calls = 0;

					handles.push(aspect.before(grid, 'removeRow', function () {
						calls++;
					}));

					handles.push(aspect.before(grid, 'insertRow', function () {
						calls++;
					}));

					testRowExists('0:0');
					grid.collection.put({
						id: '0:0',
						value: 'Modified',
						parent: '0'
					});
					assert.strictEqual(calls, 0, 'insertRow and removeRow should never be called');
				});
			});

			test.test('child remove', function () {
				return grid.expand(0).then(function () {
					testRowExists('0:0');
					grid.collection.remove('0:0');
					testRowExists('0:0');
				});
			});
		});
	});
});
