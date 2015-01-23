define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/aspect",
	// column.set can't be tested independently from a Grid,
	// so we are testing through OnDemandGrid for now.
	"dgrid/OnDemandGrid",
	"dgrid/ColumnSet",
	"dgrid/test/data/base",
	"dojo/domReady!"
], function(test, assert, lang, declare, aspect, OnDemandGrid, ColumnSet, testStore){
	
	// Helper method used to set column set() methods for various grid compositions
	function testSetMethod(grid, dfd){
		var store = lang.clone(testStore); // clone test store so we can make modifications
		document.body.appendChild(grid.domNode);
		grid.set("store", store);
		grid.startup();
		
		var changes = [
				{
					objectId: 0,
					field: "col1",
					newValue: "sleepy",
					expectedSavedValue: "SLEEPY"
				},
				{
					objectId: 1,
					field: "col3",
					newValue: "dopey",
					expectedSavedValue: "DOPEY"
				},
				{
					objectId: 2,
					field: "col4",
					newValue: "rutherford",
					expectedSavedValue: "RUTHERFORD"
				}
			],
			len = changes.length,
			i,
			change;
		
		for(i = 0; i < len; i++){
			change = changes[i];
			grid.updateDirty(change.objectId, change.field, change.newValue);
		}
		
		grid.save().then(
			dfd.callback(function(){
				for(var i = 0, change; i < changes.length; i++){
					change = changes[i];
					assert.strictEqual(store.get(change.objectId)[change.field],
						change.expectedSavedValue);
				}
			}),
			lang.hitch(dfd, "reject")
		);
		
		return dfd;
	}
	
	// the set() method to use for column.set() tests
	function sampleSetMethod(item){
		return item[this.field].toUpperCase();
	}
	
	test.suite("_StoreMixin", function () {
		var grid; // Reused for each test and common afterEach logic
		
		test.afterEach(function(){
			grid.destroy();
		});
		
		test.suite("_StoreMixin#save / column.set tests", function(){
			test.test("column.set in subRows", function(){
				grid = new OnDemandGrid({
					subRows: [
						[
							{ label: "Column 1", field: "col1", set: sampleSetMethod },
							{ label: "Column 2", field: "col2", sortable: false },
							{ label: "Column 1", field: "col1", rowSpan: 2 },
							{ label: "Column 4", field: "col4", set: sampleSetMethod }
						],
						[
							{ label: "Column 3", field: "col3", colSpan: 2, set: sampleSetMethod },
							{ label: "Column 5", field: "col5" }
						]
					],
					sort: "id"
				});
				testSetMethod(grid, this.async());
			});
			
			test.test("column.set in columnSets", function(){
				grid = new (declare([OnDemandGrid, ColumnSet]))({
					columnSets: [
						[
							[
								{ label: "Column 1", field: "col1", set: sampleSetMethod },
								{ label: "Column 2", field: "col2", sortable: false }
							],
							[
								{label: "Column 3", field: "col3", colSpan: 2, set: sampleSetMethod }
							]
						],
						[
							[
								{ label: "Column 1", field: "col1", rowSpan: 2 },
								{ label: "Column 4", field: "col4", set: sampleSetMethod }
							],
							[
								{ label: "Column 5", field: "col5" }
							]
						]
					],
					sort: "id"
				});
				testSetMethod(grid, this.async());
			});
		});
		
		test.suite("Effect of set-before-startup on refresh calls", function(){
			function createTest(property, value){
				return function(){
					var numCalls = 0;
					
					grid = new OnDemandGrid({
						columns: {
							col1: "Column 1"
						},
						sort: "id"
					});
					
					aspect.before(grid, "refresh", function(){
						numCalls++;
					});
					
					grid.set(property, value);
					document.body.appendChild(grid.domNode);
					grid.startup();
					
					assert.strictEqual(numCalls, 1, "refresh should only have been called once");
				}
			}
			
			test.test("set('store') before startup should not cause superfluous refresh",
				createTest("store", testStore));
			test.test("set('query') before startup should not cause superfluous refresh",
				createTest("query", {}));
		});
	});
});