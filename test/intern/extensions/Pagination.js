define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/_base/declare",
	"dojo/query",
	"dojo/string",
	"put-selector/put",
	"dgrid/Grid",
	"dgrid/extensions/Pagination",
	"dojo/domReady!",
	"dgrid/test/data/base"
], function(test, assert, declare, query, string, put, Grid, Pagination){
	var grid,
		handles = [],
		getColumns;

	function getColumns(){
		return {
			id: 'id',
			col1: 'Column 1',
			col2: 'Column 2',
			col5: 'Column 5'
		};
	};

	test.suite("Pagination", function(){
		test.before(function(){
			grid = new (declare([Grid, Pagination]))({
				store: testStore,
				columns: getColumns()
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.test("pagination info updates on page switch", function(){
			// switch pages and ensure that the status message and links are
			// updated
			var disabledLinks = query('span.dgrid-page-disabled', grid.paginationLinksNode);
			var expectedText = string.substitute(grid.i18nPagination.status, {start: 1, end: 10, total: 100});
			assert.strictEqual(grid.paginationStatusNode.innerHTML,
				expectedText, "incorrect initial status '" + status + "'");
			assert.strictEqual(disabledLinks.length, 1, "wrong number of disable page links: " +
				disabledLinks.length)
			assert.strictEqual(disabledLinks[0].innerHTML, "1", "wrong link is disabled");

			grid.gotoPage(2);

			disabledLinks = query('span.dgrid-page-disabled', grid.paginationLinksNode);
			expectedText = string.substitute(grid.i18nPagination.status, {start: 11, end: 20, total: 100});
			assert.strictEqual(grid.paginationStatusNode.innerHTML,
				"11 - 20 of 100 results", "incorrect status '" + status + "'");
			assert.strictEqual(disabledLinks.length, 1, "wrong number of disable page links: " +
				disabledLinks.length)
			assert.strictEqual(disabledLinks[0].innerHTML, "2", "wrong link is disabled");
		});
	});

	test.suite("Pagination (with size selector)", function(){
		test.before(function(){
			grid = new (declare([Grid, Pagination]))({
				store: testStore,
				columns: getColumns(),
				pageSizeOptions: [5, 10, 15]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		function verifyOptions(options, expectedCount){
			// verify that the values of the given set of options are in increasing order
			// optionally verify that there are the expected number of options
			var opt,
				lastVal = options[0].value;
			for (var i = 1; i < options.length; i++) {
				opt = options[i];
				assert.operator(lastVal, '<', opt.value, "values are out of order");
				lastVal = opt.value;
			}
			if (expectedCount !== undefined) {
				assert.lengthOf(options, expectedCount, "selector has wrong number of options");
			}
		};

		function rowsPerPageTest(rowsPerPage) {
			// update the grid's rowsPerPage and ensure that the selector value
			// is correct afterwards
			var selector = grid.paginationSizeSelect;
			grid.set("rowsPerPage", rowsPerPage);
			assert.strictEqual(selector.value, String(rowsPerPage),
				"selector has invalid value " + selector.value);
			verifyOptions(selector.options);
		};

		function getNonSelectedValue(options){
			// return a value that isn't selected, assuming there are at least
			// two options and unique option values
			if (options[0].selected) {
				return options[1].value;
			} else {
				return options[0].value;
			}
		};

		test.test("setting rowsPerPage to a low value properly updates selector", function(){
			rowsPerPageTest(2);
		});

		test.test("setting rowsPerPage properly updates selector", function(){
			rowsPerPageTest(7);
		});

		test.test("setting rowsPerPage to a high value properly updates selector", function(){
			rowsPerPageTest(20);
		});

		test.test("setting rowsPerPage to an existing value doesn't add a value", function(){
			var selector = grid.paginationSizeSelect,
				initialCount = selector.options.length,
				value = getNonSelectedValue(selector.options);
			grid.set("rowsPerPage", +value);
			assert.strictEqual(selector.value, value,
				"selector has invalid value " + selector.value);
			verifyOptions(selector.options, initialCount);
		});

		test.test("selecting a value from the selector doesn't change the selector options", function(){
			var selector = grid.paginationSizeSelect,
				initialCount = selector.options.length,
				targetValue = getNonSelectedValue(selector.options);

			selector.value = targetValue;
			assert.strictEqual(selector.value, targetValue, "selector has invalid value " +
				selector.value);
			verifyOptions(selector.options, initialCount);
		});
	});
});
