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
	'dgrid/test/data/testPerformanceStore'
], function (test, assert, declare, aspect, on, Grid, OnDemandGrid, Pagination,
		errorStores, createSyncStore, createAsyncStore, genericData, testPerformanceStore) {

	var PaginationGrid = declare([Grid, Pagination]),
		grid;

	// Common reusable function for tests
	function storeTest(CustomGrid, store, expectSuccess, dfd) {
		var expectedEvent = expectSuccess ? 'dgrid-refresh-complete' : 'dgrid-error',
			unexpectedEvent = !expectSuccess ? 'dgrid-refresh-complete' : 'dgrid-error';

		grid = new CustomGrid({
			collection: store
		});

		// Hook up event handler before calling startup, to be able to
		// test both synchronous and asynchronous stores
		on.once(grid, expectedEvent, function () {
			// After receiving the expected event, perform a refresh,
			// to also test resolution/rejection of the promise it returns.
			grid.refresh().then(function () {
				dfd[expectSuccess ? 'resolve' : 'reject']();
			}, function () {
				dfd[!expectSuccess ? 'resolve' : 'reject']();
			});
		});

		// Also hook up the opposite event handler, to signal failure
		on.once(grid, unexpectedEvent, function () {
			dfd.reject(new Error('Expected ' + expectedEvent + ' to fire, but ' +
				unexpectedEvent + ' fired instead.'));
		});

		document.body.appendChild(grid.domNode);
		grid.startup();
		return dfd;
	}

	function createReleaseRangeGrid(CustomGrid) {
		grid = new CustomGrid({
			collection: testPerformanceStore,
			columns: {
				id: 'ID'
			}
		});
		document.body.appendChild(grid.domNode);
		grid.startup();
	}

	test.suite('stores', function () {
		// Setup / teardown
		test.afterEach(function () {
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

		test.test('OnDemandGrid releases ranges appropriately', function () {
			var dfd = this.async();
			createReleaseRangeGrid(OnDemandGrid);

			// Since _processScroll gets called on a debounce, need to wait for it
			aspect.after(grid, '_processScroll', dfd.callback(function () {
				assert.isUndefined(grid._renderedCollection._partialResults[0],
					'Observed partial results should not include first item after scrolling');
				assert.isDefined(grid._renderedCollection._partialResults[testPerformanceStore.data.length - 1],
					'Observed partial results should include last item after scrolling');
			}));

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

		test.test('Pagination releases ranges appropriately', function () {
			createReleaseRangeGrid(PaginationGrid);
			grid.gotoPage(2);
			assert.isUndefined(grid._renderedCollection._partialResults[0],
				'Observed partial results should not include first item after going to next page');
			assert.isDefined(grid._renderedCollection._partialResults[grid.rowsPerPage],
				'Observed partial results should include first item on second page after going to next page');
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
