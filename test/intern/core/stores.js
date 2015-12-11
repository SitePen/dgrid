define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/on',
	'dgrid/Grid',
	'dgrid/OnDemandGrid',
	'dgrid/extensions/Pagination',
	'dgrid/test/data/errorStores',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/createAsyncStore',
	'dgrid/test/data/genericData',
	'dgrid/test/data/testPerformanceStore',
	'../addCss!'
], function (test, assert, declare, aspect, on, Grid, OnDemandGrid, Pagination,
		errorStores, createSyncStore, createAsyncStore, genericData, testPerformanceStore) {

	var PaginationGrid = declare([Grid, Pagination]);
	var grid;
	var handles = [];

	// Common reusable function for tests
	function storeTest(CustomGrid, store, expectSuccess, dfd) {
		var expectedEvent = expectSuccess ? 'dgrid-refresh-complete' : 'dgrid-error',
			unexpectedEvent = !expectSuccess ? 'dgrid-refresh-complete' : 'dgrid-error';

		grid = new CustomGrid({
			collection: store
		});

		// Hook up event handler before calling startup, to be able to
		// test both synchronous and asynchronous stores
		handles.push(on.once(grid, expectedEvent, function () {
			// After receiving the expected event, perform a refresh,
			// to also test resolution/rejection of the promise it returns.
			grid.refresh().then(function () {
				dfd[expectSuccess ? 'resolve' : 'reject']();
			}, function () {
				dfd[!expectSuccess ? 'resolve' : 'reject']();
			});
		}));

		// Also hook up the opposite event handler, to signal failure
		handles.push(on.once(grid, unexpectedEvent, function () {
			dfd.reject(new Error('Expected ' + expectedEvent + ' to fire, but ' +
				unexpectedEvent + ' fired instead.'));
		}));

		document.body.appendChild(grid.domNode);
		grid.startup();
		return dfd;
	}

	function createReleaseRangeGrid(CustomGrid) {
		grid = new CustomGrid({
			collection: testPerformanceStore,
			columns: {
				id: 'ID'
			},
			sort: 'id'
		});
		document.body.appendChild(grid.domNode);
		grid.startup();
	}

	function testReleaseRange(visibleId) {
		var numInserts = 0;

		handles.push(aspect.after(grid, 'insertRow', function () {
			numInserts++;
		}, true));

		testPerformanceStore.putSync(testPerformanceStore.getSync(0));
		assert.strictEqual(numInserts, 0,
			'Item from unrendered range should not be added to grid when updated');
		testPerformanceStore.putSync(testPerformanceStore.getSync(visibleId || 19999));
		assert.strictEqual(numInserts, 1,
			'Item from rendered range should be re-added to grid when updated');
	}

	test.suite('stores', function () {
		// Setup / teardown
		test.afterEach(function () {
			for (var i = handles.length; i--;) {
				handles[i].remove();
			}
			handles = [];
			grid.destroy();
		});

		var store = createSyncStore({ data: genericData }),
			asyncStore = createAsyncStore({ data: genericData });

		test.test('OnDemandGrid + sync store', function () {
			storeTest(OnDemandGrid, store, true, this.async());
		});

		test.test('OnDemandGrid + async store', function () {
			storeTest(OnDemandGrid, asyncStore, true, this.async());
		});

		test.test('OnDemandGrid + async store w/ error', function () {
			storeTest(OnDemandGrid, errorStores.asyncFetch, false, this.async());
		});

		test.test('OnDemandGrid + async store w/ total error', function () {
			storeTest(OnDemandGrid, errorStores.asyncFetchTotal, false, this.async());
		});

		test.test('OnDemandGrid observes/releases ranges appropriately', function () {
			var dfd = this.async();
			createReleaseRangeGrid(OnDemandGrid);

			// Since _processScroll gets called on a debounce, need to wait for it
			var handle = aspect.after(grid, '_processScroll', dfd.callback(function () {
				handle.remove();
				testReleaseRange();
			}), true);
			handles.push(handle);

			grid.scrollTo({ y: grid.bodyNode.scrollHeight });
			return dfd;
		});

		test.test('PaginationGrid + sync store', function () {
			storeTest(PaginationGrid, store, true, this.async());
		});

		test.test('PaginationGrid + async store', function () {
			storeTest(PaginationGrid, asyncStore, true, this.async());
		});

		test.test('PaginationGrid + async store w/ error', function () {
			storeTest(PaginationGrid, errorStores.asyncFetch, false, this.async());
		});

		test.test('Pagination observes/releases ranges appropriately', function () {
			createReleaseRangeGrid(PaginationGrid);
			grid.gotoPage(2);
			testReleaseRange(10);
		});
	});

	test.suite('Async empty stores', function () {
		test.afterEach(function () {
			grid.destroy();
		});

		var emptyStore = createAsyncStore({ data: [] });

		function createTest(Grid) {
			return function () {
				var dfd = this.async(1000);
				grid = new Grid({
					columns: {
						id: 'ID'
					},
					collection: emptyStore
				});
				document.body.appendChild(grid.domNode);
				grid.startup();

				grid.on('dgrid-error', function () {
					dfd.reject('dgrid-error should not be emitted on consecutive synchronous refresh');
				});

				grid.refresh().then(function () {
					dfd.resolve();
				});
			};
		}

		test.test('OnDemandGrid consecutive refresh with async empty store (#1065)',
			createTest(OnDemandGrid));

		test.test('Pagination consecutive refresh with async empty store',
			createTest(PaginationGrid));
	});
});
