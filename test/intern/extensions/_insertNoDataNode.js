define([
	'dojo/_base/declare',
	'dojo/query',
	'dstore/Memory',
	'dstore/Trackable',
	'dgrid/Grid',
	'dgrid/OnDemandGrid',
	'dgrid/extensions/Pagination',
	'dgrid/extensions/SingleQuery'
], function (declare, query, Memory, Trackable, Grid, OnDemandGrid, Pagination, SingleQuery) {
	var tdd = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;
	var grid;
	var PaginationGrid = declare([Grid, Pagination]);
	var SingleQueryGrid = declare([OnDemandGrid, SingleQuery]);
	var PaginationSingleQueryGrid = declare([Grid, Pagination, SingleQuery]);
	var TrackableStore = declare([Memory, Trackable]);

	function createGrid(Grid, options) {
		grid = new Grid(options);
		document.body.appendChild(grid.domNode);
		grid.startup();
	}

	function testNoDataNodeExists(exists) {
		assert.strictEqual(query('.dgrid-no-data', grid.domNode).length, exists ? 1 : 0);
	}

	tdd.suite('_insertNoDataNode', function () {

		tdd.afterEach(function () {
			if (grid) {
				grid.destroy();
				grid = undefined;
			}
		});

		tdd.suite('Pagination', function () {

			tdd.test('empty store with refresh', function () {
				createGrid(PaginationGrid, {
					collection: new TrackableStore({}),
					noDataMessage: 'No data'
				});
				testNoDataNodeExists(true);
				grid.refresh();
				testNoDataNodeExists(true);
			});
		});

		tdd.suite('SingleQuery', function () {
			tdd.test('empty store with refresh', function () {
				createGrid(SingleQueryGrid, {
					collection: new TrackableStore({}),
					noDataMessage: 'No data'
				});
				testNoDataNodeExists(true);
				grid.refresh();
				testNoDataNodeExists(true);
			});

			tdd.test('empty store add and remove', function () {
				var store = new TrackableStore();
				createGrid(SingleQueryGrid, {
					collection: store,
					columns: {
						id: 'ID',
						name: 'Name'
					},
					noDataMessage: 'No data'
				});
				testNoDataNodeExists(true);
				store.add({
					id: 1,
					name: 'Fred'
				});
				testNoDataNodeExists(false);
				store.remove(1);
				testNoDataNodeExists(true);
			});
		});

		tdd.suite('PaginationSingleQuery', function () {

			tdd.test('empty store with refresh', function () {
				createGrid(PaginationSingleQueryGrid, {
					collection: new TrackableStore({}),
					noDataMessage: 'No data'
				});
				testNoDataNodeExists(true);
				grid.refresh();
				testNoDataNodeExists(true);
			});
		});
	});
});
