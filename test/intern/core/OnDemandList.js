define([
	'dojo/query',
	'dgrid/OnDemandList',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData'
], function (query, OnDemandList, createSyncStore, genericData) {
	var tdd = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;

	tdd.suite('OnDemandList with zero rowHeight', function () {
		var list;
		var store = createSyncStore({ data: genericData });

		tdd.beforeEach(function () {
			list = new OnDemandList({
				collection: store,
				renderRow: function () {
					return document.createElement('div');
				}
			});
			document.body.appendChild(list.domNode);
			list.startup();
		});

		tdd.afterEach(function () {
			list.destroy();
		});

		tdd.test('_processScroll should bail out if rowHeight is 0', function () {
			// Bailing out with rowHeight === 0 is important because otherwise
			// _processScroll has the potential to loop infinitely.

			// _processScroll will call _trackError if it doesn't bail out and
			// thinks it should render more items, so replace it to fail the test
			list._trackError = function () {
				throw new assert.AssertionError({
					message: '_processScroll with 0 rowHeight should not result in any query'
				});
			};

			list._processScroll();
		});

		tdd.test('refresh with zero rowHeight should only render minRowsPerPage rows', function () {
			// This tests GitHub issue #965.
			assert.strictEqual(query('.dgrid-row', list.contentNode).length, list.minRowsPerPage);
		});

		tdd.test('refresh should return a QueryResults object', function () {
			var dfd = this.async();

			list.refresh().then(dfd.callback(function (results) {
				assert.property(results, 'forEach');
				assert.property(results, 'totalLength');
			}));
		});
	});

	tdd.suite('OnDemandList', function () {
		var list;
		var store = createSyncStore({ data: genericData });

		tdd.beforeEach(function () {
			list = new OnDemandList({
				collection: store,
				renderRow: function () {
					var node = document.createElement('div');
					node.innerHTML = 'Test';
					node.style.height = '16px';
					return node;
				}
			});
			document.body.appendChild(list.domNode);
			list.startup();
		});

		tdd.afterEach(function () {
			list.destroy();
		});

		tdd.test('calculated row height', function () {
			assert.strictEqual(16, list.preload.rowHeight);
			assert.strictEqual(16, list.rowHeight);
		});
	});
});
