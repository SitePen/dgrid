define([
	"intern!tdd",
	"intern/chai!assert",
	"dijit/form/TextBox",
	"dgrid/Grid",
	"dgrid/editor"
], function(test, assert, TextBox, Grid, editor){

	var grid;

	test.suite("editor plugin", function(){

		test.afterEach(function(){
			if(grid){
				grid.destroy();
			}
		});

		test.test("canEdit - always-on (instance-per-row) editor", function(){
			var results = {};
			var data = [
				{id: 1, data1: "Data 1.a", data2: "Data 2.a"},
				{id: 2, data1: "Data 1.b", data2: "Data 2.b"},
				{id: 3, data1: "Data 1.c", data2: "Data 2.c"}
			];
			grid = new Grid({
				columns: [
					{
						field: "data1",
						label: "Data 1"
					},
					editor({
						field: "data2",
						label: "Data 2",
						canEdit: function(object, value){
							results[object.id] = value;
						}
					})
				]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(data);

			assert.strictEqual(results[1], "Data 2.a",
				"canEdit should have been called (item 1)");
			assert.strictEqual(results[2], "Data 2.b",
				"canEdit should have been called (item 2)");
			assert.strictEqual(results[3], "Data 2.c",
				"canEdit should have been called (item 3)");
		});

		test.test("canEdit - editOn (shared) editor", function(){
			var results = {};
			var data = [
				{id: 1, data1: "Data 1.a", data2: "Data 2.a"},
				{id: 2, data1: "Data 1.b", data2: "Data 2.b"},
				{id: 3, data1: "Data 1.c", data2: "Data 2.c"}
			];
			grid = new Grid({
				columns: [
					{
						field: "data1",
						label: "Data 1",
						id: "data1"
					},
					editor({
						field: "data2",
						label: "Data 2",
						id: "data2",
						canEdit: function(object, value){
							results[object.id] = value;
						}
					}, TextBox, "click")
				]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(data);

			assert.isUndefined(results[1],
				"canEdit should not have been called yet for editOn editor (item 1)");
			assert.isUndefined(results[2],
				"canEdit should not have been called yet for editOn editor (item 2)");
			assert.isUndefined(results[3],
				"canEdit should not have been called yet for editOn editor (item 3)");

			grid.edit(grid.cell(1, "data2"));
			assert.isUndefined(results[1],
				"canEdit should not have been called yet for editOn editor (item 1)");
			assert.strictEqual(results[2], "Data 2.b",
				"canEdit should have been called for editOn editor (item 2)");
			assert.isUndefined(results[3],
				"canEdit should not have been called yet for editOn editor (item 3)");

			grid.edit(grid.cell(0, "data2"));
			assert.strictEqual(results[1], "Data 2.a",
				"canEdit should have been called for editOn editor (item 1)");
			assert.strictEqual(results[2], "Data 2.b",
				"canEdit should have been called for editOn editor (item 2)");
			assert.isUndefined(results[3],
				"canEdit should not have been called yet for editOn editor (item 3)");

			grid.edit(grid.cell(2, "data2"));
			assert.strictEqual(results[1], "Data 2.a",
				"canEdit should have been called for editOn editor (item 1)");
			assert.strictEqual(results[2], "Data 2.b",
				"canEdit should have been called for editOn editor (item 2)");
			assert.strictEqual(results[3], "Data 2.c",
				"canEdit should have been called for editOn editor (item 3)");
		});
	});
});
