define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/lang',
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/Deferred',
	'dijit/form/TextBox',
	'dgrid/Editor',
	'dgrid/OnDemandList',
	// column.set can't be tested independently from a Grid,
	// so we are testing through OnDemandGrid for now.
	'dgrid/OnDemandGrid',
	'dgrid/ColumnSet',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData',
	'dojo/domReady!'
], function (test, assert, lang, declare, aspect, Deferred, TextBox, Editor,
		OnDemandList, OnDemandGrid, ColumnSet, createSyncStore, genericData) {

	// Helper method used to set column set() methods for various grid compositions
	function testSetMethod(grid, dfd) {
		var store = createSyncStore({ data: genericData });
		grid.set('collection', store);
		document.body.appendChild(grid.domNode);
		grid.startup();

		var changes = [
				{
					objectId: 0,
					field: 'col1',
					newValue: 'sleepy',
					expectedSavedValue: 'SLEEPY'
				},
				{
					objectId: 1,
					field: 'col3',
					newValue: 'dopey',
					expectedSavedValue: 'DOPEY'
				},
				{
					objectId: 2,
					field: 'col4',
					newValue: 'rutherford',
					expectedSavedValue: 'RUTHERFORD'
				}
			],
			len = changes.length,
			i,
			change;

		for (i = 0; i < len; i++) {
			change = changes[i];
			grid.updateDirty(change.objectId, change.field, change.newValue);
		}

		grid.save().then(
			dfd.callback(function () {
				for (var i = 0, change; i < changes.length; i++) {
					change = changes[i];
					assert.strictEqual(store.getSync(change.objectId)[change.field],
						change.expectedSavedValue);
				}
			}),
			lang.hitch(dfd, 'reject')
		);

		return dfd;
	}

	// the set() method to use for column.set() tests
	function sampleSetMethod(item) {
		return item[this.field].toUpperCase();
	}

	test.suite('_StoreMixin', function () {
		var grid; // Reused for each test and common afterEach logic

		test.afterEach(function () {
			grid.destroy();
		});

		test.suite('_StoreMixin#_setCollection', function () {
			var store;

			test.beforeEach(function () {
				store = createSyncStore({ data: genericData });
				grid = new OnDemandList({
					collection: store
				});
				document.body.appendChild(grid.domNode);
				grid.startup();
			});

			test.test('null', function () {
				assert.isDefined(grid._renderedCollection,
					'grid._renderedCollection should be defined');
				assert.notStrictEqual(grid.contentNode.children.length, 0,
					'grid.contentNode should contain children when refreshing with a store');

				grid.set('collection', null);
				assert.isNull(grid._renderedCollection,
					'grid._renderedCollection should be null after setting collection to null');
				assert.strictEqual(grid.contentNode.children.length, 1,
					'grid.contentNode should contain one child when refreshing with a null collection');
				assert.strictEqual(grid.contentNode.children[0], grid.noDataNode,
					'grid.contentNode should contain the noDataNode');

				grid.set('collection', store);
				assert.isNotNull(grid._renderedCollection,
					'grid._renderedCollection should not be null after setting collection to store again');
				assert.notStrictEqual(grid.contentNode.children.length, 0,
					'grid.contentNode should contain children when refreshing with a store');
			});

			test.test('dirty data preservation/cleanup', function () {
				grid.updateDirty(0, 'col1', 'modified');
				assert.isDefined(grid.dirty[0], 'Dirty hash should contain entry for item 0 after updateDirty');
				grid.set('sort', 'col3');
				assert.isDefined(grid.dirty[0], 'Dirty hash should still contain entry for item 0 after sort');
				grid.set('collection', store.filter({ col2: false }));
				assert.isDefined(grid.dirty[0], 'Dirty hash should still contain entry for item 0 after filter');
				grid.set('collection', createSyncStore({ data: genericData }));
				assert.isUndefined(grid.dirty[0],
					'Dirty hash should be cleared after setting collection based on different store');
			});
		});


		test.suite('set collection before startup', function () {
			test.test('should not cause superfluous refresh',  function () {
				var numCalls = 0;

				grid = new OnDemandList();

				aspect.before(grid, 'refresh', function () {
					numCalls++;
				});

				grid.set('collection', createSyncStore(genericData));
				document.body.appendChild(grid.domNode);
				grid.startup();

				assert.strictEqual(numCalls, 1, 'refresh should only have been called once');
			});

			test.test('store modifications before startup', function () {
				var numCalls = 0;
				var store = createSyncStore({ data: genericData });

				grid = new OnDemandList({
					columns: {
						col1: 'Column 1',
						col2: 'Column 2'
					}
				});

				var insertHandle = aspect.after(grid, 'insertRow', function (row) {
					numCalls++;
					return row;
				});

				var removeHandle = aspect.after(grid, 'removeRow', function () {
					numCalls++;
				});

				var destroyHandle = aspect.after(grid, 'destroy', function () {
					destroyHandle.remove();
					insertHandle.remove();
					removeHandle.remove();
				});

				document.body.appendChild(grid.domNode);

				grid.set('collection', store);
				store.addSync({
					col1: 'inserted value',
					col2: true
				});

				var item = store.getSync(1);
				item.col1 = 'this has changed';
				store.putSync(item);

				assert.strictEqual(numCalls, 0,
					'Should not react to store item modifications');

				grid.startup();
				assert.isTrue(numCalls > 0,
					'Rows should appear inserted after startup');
			});
		});

		test.test('_StoreMixin#_onNotification', function () {
			var store = createSyncStore({ data: genericData }),
				notificationCount = 0,
				lastNotificationEvent = null;

			grid = new OnDemandList({
				collection: store,
				_onNotification: function (rows, event) {
					notificationCount++;
					lastNotificationEvent = event;
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();

			var item = store.getSync(1);
			store.removeSync(item.id);
			assert.equal(notificationCount, 1);
			assert.isNotNull(lastNotificationEvent);
			assert.equal(lastNotificationEvent.type, 'delete');
			assert.equal(lastNotificationEvent.id, item.id);

			lastNotificationEvent = null;
			store.addSync(item);
			assert.equal(notificationCount, 2);
			assert.isNotNull(lastNotificationEvent);
			assert.equal(lastNotificationEvent.type, 'add');
			assert.equal(lastNotificationEvent.target, item);

			item.col1 = 'changed';
			lastNotificationEvent = null;
			store.putSync(item);
			assert.equal(notificationCount, 3);
			assert.isNotNull(lastNotificationEvent);
			assert.equal(lastNotificationEvent.type, 'update');
			assert.equal(lastNotificationEvent.target, item);
		});

		test.suite('_StoreMixin#_trackError', function () {
			var emittedErrorCount,
				lastEmittedError,
				expectedValue;

			function expectedSuccess(actualValue) {
				assert.strictEqual(actualValue, expectedValue,
					'Resolved promise should yield expected value');
				assert.strictEqual(emittedErrorCount, 0,
					'dgrid-error event should not have fired');
			}
			function expectedError(error) {
				assert.strictEqual(error.message, expectedValue,
					'An error with the expected message should be thrown');
				assert.strictEqual(emittedErrorCount, 1,
					'A dgrid-error event should have fired');
				assert.strictEqual(lastEmittedError, error,
					'The error should be accessible from the dgrid-error event');
			}
			function unexpectedSuccess() {
				throw new Error('Unexpected resolution');
			}

			test.beforeEach(function () {
				grid = new OnDemandList();

				grid.on('dgrid-error', function (event) {
					emittedErrorCount++;
					lastEmittedError = event.error;
				});

				emittedErrorCount = 0;
				lastEmittedError = null;
			});

			test.test('_StoreMixin#_trackError - sync value', function () {
				expectedValue = 'expected';
				return grid._trackError(function () {
					return expectedValue;
				}).then(expectedSuccess);
			});

			test.test('_StoreMixin#_trackError - async value', function () {
				expectedValue = 'expected-async';
				return grid._trackError(function () {
					var dfd = new Deferred();
					setTimeout(function () {
						dfd.resolve(expectedValue);
					}, 100);
					return dfd.promise;
				}).then(expectedSuccess);
			});

			test.test('_StoreMixin#_trackError - sync error', function () {
				expectedValue = 'expected-error';
				return grid._trackError(function () {
					throw new Error(expectedValue);
				}).then(unexpectedSuccess, expectedError);
			});

			test.test('_StoreMixin#_trackError - async error', function () {
				// async error
				expectedValue = 'expected-async-error';
				return grid._trackError(function () {
					var dfd = new Deferred();
					setTimeout(function () {
						dfd.reject(new Error(expectedValue));
					}, 100);
					return dfd.promise;
				}).then(unexpectedSuccess, expectedError);
			});
		});

		test.suite('_StoreMixin#refreshCell', function () {
			var store;

			test.beforeEach(function () {
				store = createSyncStore({ data: genericData });
				grid = new (declare([ OnDemandGrid, Editor ]))({
					columns: {
						col1: 'Column 1',
						col3: {
							label: 'Column 3',
							editor: TextBox
						}
					},
					collection: store,
					shouldTrackCollection: false
				});
				document.body.appendChild(grid.domNode);
				grid.startup();
			});

			test.test('no change', function () {
				var cell = grid.cell('2', 'col1');
				var oldValue = cell.element.innerHTML;

				return grid.refreshCell(cell).then(function () {
					assert.strictEqual(cell.element.innerHTML, oldValue, 'Displayed cell value should not change');
				});
			});

			test.test('dirty change', function () {
				var cell = grid.cell('2', 'col1');
				var newValue = 'new value';

				grid.updateDirty(2, 'col1', newValue);
				return grid.refreshCell(cell).then(function () {
					assert.strictEqual(cell.element.innerHTML, newValue, 'Displayed cell value should change');
				});
			});

			test.test('store change', function () {
				var cell = grid.cell('2', 'col1');
				var oldValue = cell.element.innerHTML;
				var newValue = 'new value';

				var item = cell.row.data;
				item.col1 = newValue;
				grid.collection.putSync(item);
				assert.strictEqual(cell.element.innerHTML, oldValue, 'Displayed cell value should not change');

				return grid.refreshCell(cell).then(function () {
					assert.strictEqual(cell.element.innerHTML, newValue, 'Displayed cell value should change');
				});
			});

			test.test('widget destruction', function () {
				var cell = grid.cell('2', 'col3');
				var widget = cell.element.widget;
				var wasDestroyed = false;

				aspect.after(widget, 'destroy', function () {
					wasDestroyed = true;
				});

				return grid.refreshCell(cell).then(function () {
					assert.isTrue(wasDestroyed, 'Cell\'s editor widget should be destroyed when refreshCell runs');
				});
			});
		});

		test.suite('_StoreMixin#save', function () {
			var store;

			test.beforeEach(function () {
				store = createSyncStore({ data: genericData });
				grid = new OnDemandList({
					collection: store
				});
				document.body.appendChild(grid.domNode);
				grid.startup();
			});

			test.test('API', function () {
				this.async(1000);
				grid.updateDirty(0, 'col1', 'important');
				grid.updateDirty(1, 'col1', 'normal');

				return grid.save().then(function (results) {
					assert.strictEqual(results.toString(), '[object Object]', 'Resolved value should be an object');
					assert.strictEqual(results[0], store.getSync(0),
						'Each key in results should correspond to a saved item (0)');
					assert.strictEqual(results[1], store.getSync(1),
						'Each key in results should correspond to a saved item (1)');
				});
			});

			test.test('Should return promise even if nothing needs to be put', function () {
				this.async(1000);
				var promise = grid.save();
				assert.isDefined(promise.then, 'grid.save() should return a promise');
				return promise.then(function (results) {
					assert.strictEqual(results.toString(), '[object Object]', 'Resolved value should be an object');
					var count = 0;
					// jshint unused: false
					for (var k in results) {
						count++;
					}
					assert.strictEqual(count, 0, 'Resolved object should have no keys');
				});
			});
		});

		test.suite('_StoreMixin#save / column.set tests', function () {
			test.test('column.set in subRows', function () {
				grid = new OnDemandGrid({
					subRows: [
						[
							{ label: 'Column 1', field: 'col1', set: sampleSetMethod },
							{ label: 'Column 2', field: 'col2', sortable: false },
							{ label: 'Column 1', field: 'col1', rowSpan: 2 },
							{ label: 'Column 4', field: 'col4', set: sampleSetMethod }
						],
						[
							{ label: 'Column 3', field: 'col3', colSpan: 2, set: sampleSetMethod },
							{ label: 'Column 5', field: 'col5' }
						]
					]
				});
				testSetMethod(grid, this.async(1000));
			});

			test.test('column.set in columnSets', function () {
				grid = new (declare([OnDemandGrid, ColumnSet]))({
					columnSets: [
						[
							[
								{ label: 'Column 1', field: 'col1', set: sampleSetMethod },
								{ label: 'Column 2', field: 'col2', sortable: false }
							],
							[
								{label: 'Column 3', field: 'col3', colSpan: 2, set: sampleSetMethod }
							]
						],
						[
							[
								{ label: 'Column 1', field: 'col1', rowSpan: 2 },
								{ label: 'Column 4', field: 'col4', set: sampleSetMethod }
							],
							[
								{ label: 'Column 5', field: 'col5' }
							]
						]
					]
				});
				testSetMethod(grid, this.async(1000));
			});
		});
	});
});
