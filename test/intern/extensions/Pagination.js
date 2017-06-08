define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/keys',
	'dojo/on',
	'dojo/query',
	'dojo/string',
	'dgrid/Grid',
	'dgrid/OnDemandList',
	'dgrid/extensions/Pagination',
	'dgrid/test/data/createSyncStore',
	'dgrid/test/data/genericData',
	'dojo/domReady!'
], function (test, assert, declare, keys, on, query, string, Grid, OnDemandList, Pagination, createSyncStore,
			 genericData) {
	var grid,
		PaginationGrid = declare([Grid, Pagination]);

	function getColumns() {
		return {
			id: 'id',
			col1: 'Column 1',
			col2: 'Column 2',
			col5: 'Column 5'
		};
	}

	function createTestStore() {
		return createSyncStore({ data: genericData });
	}

	function createGrid(factoryFn) {
		// Make sure there is only one grid on the page at a time.
		if (grid) {
			grid.destroy();
		}
		grid = factoryFn();
		document.body.appendChild(grid.domNode);
		grid.startup();
	}

	test.suite('Pagination', function () {
		test.beforeEach(function () {
			createGrid(function () {
				return new PaginationGrid({
					collection: createTestStore(),
					columns: getColumns()
				});
			});
		});

		test.afterEach(function () {
			grid.destroy();
		});

		test.test('Pagination info updates on page switch', function () {
			// switch pages and ensure that the status message and links are
			// updated
			var disabledLinks = query('span.dgrid-page-disabled', grid.paginationLinksNode),
				expectedText = string.substitute(grid.i18nPagination.status,
					{ start: 1, end: 10, total: 100 });

			function testAssertions(expectedPage) {
				assert.strictEqual(grid.paginationStatusNode.innerHTML, expectedText,
					'should find expected status message; received \'' + status + '\'');
				assert.strictEqual(disabledLinks.length, 1,
					'should find expected number of disabled page links: found ' +
					disabledLinks.length);
				assert.strictEqual(string.trim(disabledLinks[0].innerHTML), expectedPage,
					'link for active page (' + expectedPage + ') should be disabled');
				for (var i = 0; i < disabledLinks.length; i++) {
					assert.equal(disabledLinks[i].tabIndex, -1, 'disabled link should have -1 tabIndex');
				}
			}

			testAssertions('1');

			grid.gotoPage(2);
			disabledLinks = query('span.dgrid-page-disabled', grid.paginationLinksNode);
			expectedText = string.substitute(grid.i18nPagination.status, {start: 11, end: 20, total: 100});

			testAssertions('2');
		});

		test.test('Pagination info updates when an item is added/removed', function () {
			function testAssertions(expectedTotal, expectedLastPage) {
				assert.strictEqual(grid.paginationStatusNode.innerHTML,
					string.substitute(grid.i18nPagination.status, {
						start: 1,
						end: 10,
						total: expectedTotal
					}),
					'total displayed in status area should be ' + expectedTotal
				);
				assert.strictEqual(grid.paginationLinksNode.lastChild.innerHTML, '' + expectedLastPage,
					'last page number displayed should be ' + expectedLastPage);
			}

			testAssertions(100, 10);

			grid.collection.addSync({ id: 100 });
			testAssertions(101, 11);

			grid.collection.removeSync(100);
			testAssertions(100, 10);
		});

		test.test('Should not pass 0 to gotoPage when removing last item (#1192)', function() {
			var store = createSyncStore({ data: [ { id: 1 } ] });
			grid.set('collection', store);

			var pageNumber;
			grid.gotoPage = function (page) {
				pageNumber = page;
			};

			store.removeSync(1);
			assert.strictEqual(pageNumber, 1, 'Should have refreshed page 1 after removing the last item');

			store.putSync({ id: 2 });
			assert.strictEqual(pageNumber, 1, 'Should have refreshed page 1 after adding the first item');
		});
	});

	test.suite('Pagination size selector initialization tests', function () {
		// Each test in this suite is responsible for instantiating the grid
		test.afterEach(function () {
			grid.destroy();
		});

		test.test('pageSizeOptions + unique rowsPerPage during creation', function () {
			createGrid(function () {
				return new PaginationGrid({
					collection: createTestStore(),
					columns: getColumns(),
					// Purposely set pageSizeOptions out of order to test setter
					pageSizeOptions: [25, 15, 5],
					// Purposely set rowsPerPage to a value not in pageSizeOptions
					rowsPerPage: 10
				});
			});

			assert.strictEqual(grid.paginationSizeSelect.tagName, 'SELECT',
				'paginationSizeSelect should reference a SELECT element');
			assert.lengthOf(grid.pageSizeOptions, 4,
				'pageSizeOptions should have additional item for unique rowsPerPage');
			assert.strictEqual(grid.pageSizeOptions[0], 5,
				'pageSizeOptions should be sorted ascending');

			// Now empty pageSizeOptions and confirm that the select was removed
			grid.set('pageSizeOptions', null);
			assert.isNull(grid.paginationSizeSelect,
				'paginationSizeSelect reference should be cleared after setting empty pageSizeOptions');
			assert.strictEqual(query('select', grid.footerNode).length, 0,
				'paginationSizeSelect node should have been destroyed');
		});

		test.test('pageSizeOptions added after creation', function () {
			createGrid(function () {
				return new PaginationGrid({
					collection: createTestStore(),
					columns: getColumns(),
					rowsPerPage: 10
				});
			});

			assert.isUndefined(grid.paginationSizeSelect,
				'paginationSizeSelect should not exist yet (no options)');

			// Now add pageSizeOptions (purposely out of order) and confirm it
			// is properly added
			grid.set('pageSizeOptions', [25, 15, 5]);

			assert.strictEqual(grid.paginationSizeSelect.tagName, 'SELECT',
				'paginationSizeSelect should reference a SELECT element');
			assert.lengthOf(grid.pageSizeOptions, 4,
				'pageSizeOptions should have additional item for unique rowsPerPage');
			assert.strictEqual(grid.pageSizeOptions[0], 5,
				'pageSizeOptions should be sorted ascending');
		});

		test.test('hitting "Enter" key in pagination page input changes page', function () {
			createGrid(function () {
				return new PaginationGrid({
					collection: createTestStore(),
					columns: getColumns(),
					pagingTextBox: true
				});
			});

			var textbox = query('.dgrid-page-input', grid.paginationLinksNode)[0];
			assert.strictEqual(grid._currentPage, 1, 'Initial page should be 1');
			textbox.value = '2';
			on.emit(textbox, 'keypress', { keyCode: keys.ENTER });
			assert.strictEqual(grid._currentPage, 2, 'Grid should change to page 2');
		});
	});

	test.suite('Pagination size selector', function () {
		test.before(function () {
			createGrid(function () {
				return new PaginationGrid({
					collection: createTestStore(),
					columns: getColumns(),
					pageSizeOptions: [5, 10, 15]
				});
			});
		});
		test.after(function () {
			if (grid) {
				grid.destroy();
				grid = undefined;
			}
		});

		function verifyOptions(options, expectedCount) {
			// verify that the values of the given set of options are in increasing order
			// optionally verify that there are the expected number of options
			var opt,
				lastVal = options[0].value;
			for (var i = 1; i < options.length; i++) {
				opt = options[i];
				assert.isTrue(+lastVal < +opt.value, 'values should be in order');
				lastVal = opt.value;
			}
			if (expectedCount !== undefined) {
				assert.lengthOf(options, expectedCount,
					'selector should have expected number of options');
			}
		}

		function rowsPerPageTest(rowsPerPage) {
			// update the grid's rowsPerPage and ensure that the selector value
			// is correct afterwards
			var select = grid.paginationSizeSelect;
			grid.set('rowsPerPage', rowsPerPage);
			assert.strictEqual(select.value, '' + rowsPerPage,
				'size select should have expected value ' + select.value);
			verifyOptions(select.options);
		}

		function getNonSelectedValue(options) {
			// return a value that isn't selected, assuming there are at least
			// two options and unique option values
			if (options[0].selected) {
				return options[1].value;
			} else {
				return options[0].value;
			}
		}

		test.test('setting rowsPerPage to a low value properly updates select', function () {
			rowsPerPageTest(2);
		});

		test.test('setting rowsPerPage properly updates select', function () {
			rowsPerPageTest(7);
		});

		test.test('setting rowsPerPage to a high value properly updates select', function () {
			rowsPerPageTest(20);
		});

		test.test('setting rowsPerPage to an existing value doesn\'t add a value', function () {
			var selector = grid.paginationSizeSelect,
				initialCount = selector.options.length,
				value = getNonSelectedValue(selector.options);
			grid.set('rowsPerPage', +value);
			assert.strictEqual(selector.value, value,
				'size select should have expected value ' + selector.value);
			verifyOptions(selector.options, initialCount);
		});

		test.test('selecting a value from the selector doesn\'t change the selector options', function () {
			var selector = grid.paginationSizeSelect,
				initialCount = selector.options.length,
				targetValue = getNonSelectedValue(selector.options);

			// TODO: this would do better as a functional test;
			// as-is, we need to emit a change event manually
			selector.value = targetValue;
			on.emit(selector, 'change', {});
			assert.strictEqual(selector.value, targetValue,
				'size select should have expected value ' + selector.value);
			assert.strictEqual(+targetValue, grid.rowsPerPage,
				'rowsPerPage should have numeric value equivalent to the selected value');
			verifyOptions(selector.options, initialCount);
		});
	});

	test.suite('Pagination with OnDemandGrid', function () {
		var badList;
		var builtInWarn;

		test.afterEach(function () {
			if (badList) {
				badList.destroy();
				badList = undefined;
			}
			if (builtInWarn) {
				console.warn = builtInWarn;
				builtInWarn = undefined;
			}
		});

		test.test('Invalid list+pagination combination', function () {
			// When the Pagination extension is used with OnDemandList, a warning should appear in the console
			// telling the dev that they have constructed an invalid class combination.
			var warnCalled = true;
			builtInWarn = console.warn;
			console.warn = function (message) {
				warnCalled = true;
				assert.strictEqual('The Pagination extension is not compatible with dgrid/OnDemandList and ' +
					'dgrid/OnDemandGrid. Please use dgrid/List or dgrid/Grid as a base class.', message);
			};

			var BadList = declare([OnDemandList, Pagination]);
			badList = new BadList({});
			document.body.appendChild(badList.domNode);
			badList.startup();

			// Make sure OnDemandList implements the method the Pagination extension is looking for.  If
			// the method is missing, the warning will not be generated.
			assert.isTrue(badList._processScroll != null);
			assert.isTrue(warnCalled);
		});
	});
});
