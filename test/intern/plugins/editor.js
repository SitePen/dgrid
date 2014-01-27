define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/on",
	"dijit/form/TextBox",
	"dgrid/Grid",
	"dgrid/editor"
], function(test, assert, on, TextBox, Grid, editor){

	var grid;

	test.suite("editor plug-in", function(){

		test.afterEach(function(){
			if(grid){
				grid.destroy();
			}
		});

		test.test("canEdit - not shared editor", function(){
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

			assert.strictEqual(results[1], "Data 2.a");
			assert.strictEqual(results[2], "Data 2.b");
			assert.strictEqual(results[3], "Data 2.c");
		});

		test.test("canEdit - shared editor", function(){
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

			assert.isUndefined(results[1]);
			assert.isUndefined(results[2]);
			assert.isUndefined(results[3]);

			on.emit(grid.cell(1, "data2").element, "click", {});
			assert.isUndefined(results[1]);
			assert.strictEqual(results[2], "Data 2.b");
			assert.isUndefined(results[3]);

			on.emit(grid.cell(0, "data2").element, "click", {});
			assert.strictEqual(results[1], "Data 2.a");
			assert.strictEqual(results[2], "Data 2.b");
			assert.isUndefined(results[3]);

			on.emit(grid.cell(2, "data2").element, "click", {});
			assert.strictEqual(results[1], "Data 2.a");
			assert.strictEqual(results[2], "Data 2.b");
			assert.strictEqual(results[3], "Data 2.c");
		});
	});
});
