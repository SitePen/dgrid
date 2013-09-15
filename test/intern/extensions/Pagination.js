define([
	"intern!tdd",
	"intern/assert",
	"dojo/_base/declare",
	"dojo/query",
	"put-selector/put",
	"dgrid/OnDemandGrid",
	"dgrid/extensions/Pagination",
	"dojo/domReady!",
	"dgrid/test/data/base"
], function(test, assert, declare, query, put, OnDemandGrid, Pagination){
	var grid,
		handles = [],
		getColumns;

	getColumns = function(){
		return {
			id: 'id',
			col1: 'Column 1',
			col2: 'Column 2',
			col5: 'Column 5'
		};
	};

	test.suite("Pagination", function(){
		test.before(function(){
			grid = new (declare([OnDemandGrid, Pagination]))({
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
			assert.strictEqual(grid.paginationStatusNode.innerHTML,
							   "1 - 10 of 100 results", "incorrect initial status '" +
							   status + "'");
			assert.strictEqual(disabledLinks.length, 1, "wrong number of disable page links: " +
							   disabledLinks.length)
			assert.strictEqual(disabledLinks[0].innerHTML, "1", "wrong link is disabled");

			grid.gotoPage(2);

			disabledLinks = query('span.dgrid-page-disabled', grid.paginationLinksNode);
			assert.strictEqual(grid.paginationStatusNode.innerHTML,
							   "11 - 20 of 100 results", "incorrect status '" +
							   status + "'");
			assert.strictEqual(disabledLinks.length, 1, "wrong number of disable page links: " +
							   disabledLinks.length)
			assert.strictEqual(disabledLinks[0].innerHTML, "2", "wrong link is disabled");
		});
	});

	test.suite("Pagination (with size selector)", function(){
		test.before(function(){
			grid = new (declare([OnDemandGrid, Pagination]))({
				store: testStore,
				columns: getColumns(),
				pageSizeOptions: [5, 10, 15]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.test("setting rowsPerPage updates selector value", function(){
			// update the grid's rowsPerPage and ensure that the selector value
			// is correct afterwards
			var selector = query("select.dgrid-page-size", grid.domNode)[0];
			grid.set("rowsPerPage", 7);
			assert.strictEqual(selector.value, "7", "selector has invalid value " +
							   selector.value);
		});
	});
});
