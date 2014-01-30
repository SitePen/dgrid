define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/Deferred",
	// column.set can't be tested independently from a Grid,
	// so we are testing through OnDemandGrid for now.
	"dgrid/OnDemandGrid",
	"dgrid/ColumnSet",
	"dgrid/test/data/createSyncStore",
	"dgrid/test/data/genericData",
	"dojo/domReady!"
], function(test, assert, lang, declare, Deferred, OnDemandGrid, ColumnSet, createSyncStore, genericData){

	// Helper method used to set column set() methods for various grid compositions
	function testSetMethod(grid, dfd){
		var store = createSyncStore({ data: genericData });
		grid.set("collection", store);
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

	test.suite("_StoreMixin", function(){
		var grid; // Reused for each test and common afterEach logic

		test.afterEach(function(){
			grid.destroy();
		});

		test.test("_StoreMixin#_onNotification", function(){
			var store = createSyncStore({ data: genericData }),
				notificationCount = 0,
				lastNotificationEvent = null;

			grid = new OnDemandGrid({
				collection: store,
				_onNotification: function(rows, event){
					notificationCount++;
					lastNotificationEvent = event;
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();

			var item = store.get(1);
			store.remove(item.id);
			assert.equal(notificationCount, 1);
			assert.isNotNull(lastNotificationEvent);
			assert.equal(lastNotificationEvent.type, "remove");
			assert.equal(lastNotificationEvent.id, item.id);

			lastNotificationEvent = null;
			store.add(item);
			assert.equal(notificationCount, 2);
			assert.isNotNull(lastNotificationEvent);
			assert.equal(lastNotificationEvent.type, "add");
			assert.equal(lastNotificationEvent.target, item);

			item.col1 = "changed";
			lastNotificationEvent = null;
			store.put(item);
			assert.equal(notificationCount, 3);
			assert.isNotNull(lastNotificationEvent);
			assert.equal(lastNotificationEvent.type, "update");
			assert.equal(lastNotificationEvent.target, item);
		});

		test.test("_StoreMixin#_trackError", function(){
			grid = new OnDemandGrid();

			function unexpectedSuccess(){ throw new Error("Unexpected resolution"); }

			var emittedErrorCount = 0,
				lastEmittedError;
			grid.on("dgrid-error", function(event){
				emittedErrorCount++;
				lastEmittedError = event.error;
			});

			// sync value
			var expectedValue = "expected";
			return grid._trackError(function(){ return expectedValue}).then(function(actualValue){
				assert.strictEqual(actualValue, expectedValue);
			}).then(function(){
				// async value
				expectedValue = "expected-async";
				return grid._trackError(function(){
					var dfd = new Deferred();
					dfd.resolve(expectedValue);
					return dfd.promise;
				});
			}).then(function(actualValue){
				assert.strictEqual(actualValue, expectedValue);
			}).then(function(){
				// sync error
				assert.strictEqual(emittedErrorCount, 0);
				expectedValue = "expected-error";
				return grid._trackError(function(){
					throw new Error(expectedValue);
				});
			}).then(unexpectedSuccess, function(err){
				assert.strictEqual(err.message, expectedValue);
				assert.strictEqual(emittedErrorCount, 1);
				assert.strictEqual(lastEmittedError.message, expectedValue);
			}).then(function(){
				// async error
				expectedValue = "expected-async-error";
				return grid._trackError(function(){
					var dfd = new Deferred();
					dfd.reject(new Error(expectedValue));
					return dfd.promise;
				});
			}).then(unexpectedSuccess, function(err){
				assert.strictEqual(err.message, expectedValue);
				assert.strictEqual(emittedErrorCount, 2);
				assert.strictEqual(lastEmittedError.message, expectedValue);
			});
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
					]
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
					]
				});
				testSetMethod(grid, this.async());
			});
		});
	});
});
