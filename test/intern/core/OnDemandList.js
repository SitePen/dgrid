define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/query',
	'dgrid/OnDemandList',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData'
], function (test, assert, query, OnDemandList, createSyncStore, genericData) {
	test.suite('OnDemandList with zero rowHeight', function () {
		var list;
		var store = createSyncStore({ data: genericData });

		test.beforeEach(function () {
			list = new OnDemandList({
				collection: store,
				renderRow: function () {
					return document.createElement('div');
				}
			});
			document.body.appendChild(list.domNode);
			list.startup();
		});

		test.afterEach(function () {
			list.destroy();
		});

		test.test('_processScroll should bail out if rowHeight is 0', function () {
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

		test.test('refresh with zero rowHeight should only render minRowsPerPage rows', function () {
			// This tests GitHub issue #965.
			assert.strictEqual(query('.dgrid-row', list.contentNode).length, list.minRowsPerPage);
		});
	});
});
