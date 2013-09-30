define([
	"intern!tdd",
	"intern/assert",
	"dgrid/Grid",
	"dgrid/extensions/NestedSort",
	"dojo/_base/declare",
	"dgrid/test/data/base"
], function(test, assert, Grid, NestedSort, declare){
	var columns = {
			col1: "Column 1",
			col3: "Column 3",
			col5: "Column 5"
		},
		grid;
	
	test.suite("NestedSort (Grid)", function(){
		test.before(function(){
			grid = new (declare([Grid, NestedSort]))({
				columns: columns,
				sort: "id",
				store: testStore
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.after(function(){
			grid.destroy();
		});

		test.beforeEach(function(){
			grid.set("sort", "id");
			grid.set("sortDepthLimit", null);
		});

		test.test("grid.sort unaffected", function(){
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "id", descending: undefined }
			], "default sort did not return expected value");

			grid.set("sort", "col1");
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col1", descending: undefined }
			], "sort of one element did not return expected value");

			var sort = [
				{ attribute: "id", descending: true },
				{ attribute: "col1", descending: false }
			];
			grid.set("sort", sort);
			assert.deepEqual(grid.get("sort"), sort,
				"sort of multiple elements did not return expected value");
		});

		test.test("column sorting - insert new", function(){
			grid.columns["col1"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col1", descending: false },
				{ attribute: "id", descending: undefined }
			], "sort incorrect after one column click");

			grid.columns["col5"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col5", descending: false },
				{ attribute: "col1", descending: false },
				{ attribute: "id", descending: undefined }
			], "sort incorrect after two column clicks");
		});

		test.test("column sorting - toggle first", function(){
			grid.set("sort", [
				{ attribute: "col1", descending: undefined },
				{ attribute: "col5", descending: false }
			]);

			grid.columns["col1"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col1", descending: true },
				{ attribute: "col5", descending: false }
			], "sort not changed to descending");

			grid.columns["col1"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col1", descending: false },
				{ attribute: "col5", descending: false }
			], "sort not changed to ascending");
		});

		test.test("column sorting - move to front", function(){
			grid.set("sort", [
				{ attribute: "col1", descending: undefined },
				{ attribute: "col3", descending: true },
				{ attribute: "col5", descending: false }
			]);

			grid.columns["col3"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col3", descending: true },
				{ attribute: "col1", descending: undefined },
				{ attribute: "col5", descending: false }
			], "sort not changed to col3");

			grid.columns["col5"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col5", descending: false },
				{ attribute: "col3", descending: true },
				{ attribute: "col1", descending: undefined }
			], "sort not changed to col5");

			grid.columns["col1"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col1", descending: undefined },
				{ attribute: "col5", descending: false },
				{ attribute: "col3", descending: true }
			], "sort not changed to col1");
		});

		test.test("column sorting - sortDepthLimit", function(){
			grid.set("sortDepthLimit", 2);

			grid.columns["col1"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col1", descending: false },
				{ attribute: "id", descending: undefined }
			], "sort incorrect after one column click");

			grid.columns["col5"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col5", descending: false },
				{ attribute: "col1", descending: false }
			], "sort incorrect after two column clicks");

			grid.columns["col3"].headerNode.click();
			assert.deepEqual(grid.get("sort"), [
				{ attribute: "col3", descending: false },
				{ attribute: "col5", descending: false }
			], "sort incorrect after three column clicks");
		});
	});
});
