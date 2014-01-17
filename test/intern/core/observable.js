define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/_base/declare",
	"dojo/query",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"dgrid/OnDemandList",
	"dgrid/OnDemandGrid",
	"put-selector/put",
	"dojo/aspect"
], function(test, assert, declare, query, Memory, Observable, OnDemandList, OnDemandGrid, put, aspect){

	var widget,
		storeCounter = 0;

	function destroyWidget(){
		if(widget){
			widget.destroy();
			widget = null;
		}
	}

	function indexToId(index){
		return (index + 1) * 10;
	}

	function createData(numStoreItems){
		var data = [];
		for(var i = 0; i < numStoreItems; i++){
			var id = indexToId(i);
			data.push({id: id, value: "Value " + id + " / Store " + storeCounter});
		}
		return data;
	}

	function createStore(numStoreItems){
		storeCounter++;
		return Observable(new Memory({
			data: createData(numStoreItems)
		}));
	}

	var cnt = 0;

	function createGrid(numStoreItems, itemsPerQuery, overlap){
		widget = new OnDemandGrid({
			store: createStore(numStoreItems),
			minRowsPerPage: itemsPerQuery,
			overlap: overlap,
			columns: {
				id: "ID",
				value: "Value"
			},
			sort: "id"
		});
		document.body.appendChild(widget.domNode);
		widget.startup();
	}

	function createList(numStoreItems, itemsPerQuery, overlap){
		widget = new OnDemandList({
			store: createStore(numStoreItems),
			minRowsPerPage: itemsPerQuery,
			overlap: overlap,
			renderRow: function(object){
				return put("div", object.value);
			},
			sort: "id"
		});
		document.body.appendChild(widget.domNode);
		widget.startup();
	}

	function itemTest(itemAction, index, numToModify, backwards){
		// Creates a single test case for performing an action on numToModify rows/items.
		var description = itemAction.actionName + " " + numToModify + " item" + (numToModify > 1 ? "s" : "") +
			" starting at index " + index + " going " + (backwards ? "down" : "up");

		numToModify = numToModify || 1;

		test.test(description, function(){
			var i, cnt, store = widget.store,
				step = function(){
					cnt++;
					backwards ? i-- : i++;
				},
				tmp, expectedValues = [],
				msgPrefix, queryStr;

			function testRow(element, i){
				var expectedValue = expectedValues[i];
				if(expectedValue == null || expectedValue.deleted){
					assert.isTrue(element == null, msgPrefix + "row at index " + i + " should not be found");
				}else{
					expectedValue = expectedValue.value;
					assert.isTrue(element != null, msgPrefix + "row at index " + i + " with an expected value of \"" + expectedValue + "\" is missing");
					assert.strictEqual(expectedValue, element.innerHTML, msgPrefix + element.innerHTML + " should be " + expectedValue);
				}
			}

			// Perform the actions and update the array of expected values.
			expectedValues = createData(widget.store.data.length);
			for(i = index, cnt = 0; cnt < numToModify; step()){
				itemAction(indexToId(i), expectedValues);
			}

			// Use the dgrid widget API to test if the action was performed properly.
			msgPrefix = "dgrid API: ";
			tmp = [];
			for(i = 0; i < expectedValues.length; i++){
				var expectedValue = expectedValues[i],
					expectedId = expectedValue.id;
				testRow(widget.columns ? widget.cell(expectedId, "value").element : widget.row(expectedId).element, i);
				if(!expectedValue.deleted){
					tmp.push(expectedValue);
				}
			}
			expectedValues = tmp;

			// Query the DOM to verify the structure matches the expected results.
			msgPrefix = "DOM query: ";
			query(widget.columns ? ".dgrid-content .field-value" : ".dgrid-row", widget.domNode).forEach(testRow);
		});
	}

	function itemTestSuite(widgetClassName, createWidget, config){
		// Create a test suite that performs one action type (itemAction) on 1 to config.itemsModifiedMax with
		// a given amount of overlap.
		var index, numToModify,
			overlap = config.overlap;

		test.suite(widgetClassName + " with " + overlap + " overlap", function(){

			var storeSize = config.storeSize;
			test.beforeEach(function(){
				createWidget(storeSize, config.itemsPerQuery, config.overlap);
			});

			test.afterEach(destroyWidget);

			// Modify items counting up.
			for(numToModify = 1; numToModify <= config.itemsModifiedMax; numToModify++){
				for(index = 0; index <= (storeSize - numToModify); index++){
					itemTest(config.itemAction, index, numToModify);
				}
			}
			// Modify items counting down.  Starting at a count of 2 because
			// single item modification were tested above.
			for(numToModify = 2; numToModify <= config.itemsModifiedMax; numToModify++){
				for(index = numToModify - 1; index < storeSize; index++){
					itemTest(config.itemAction, index, numToModify, true);
				}
			}
		});
	}

	function itemActionTestSuite(description, itemAction, config){
		// Creates multiple item test suites for a given action (itemAction):
		// - a grid that executes a single query
		// - a list that executes a single query
		// - grids with overlap from 0 to config.itemOverlapMax
		// - lists with overlap from 0 to config.itemOverlapMax

		// Note: for debugging, comment out the contents of destroyWidget so the dgrid widgets are not destroyed.
		// Each widget uses a different store id and those ids are used in the row contents allowing you to
		// easily match up an error message like
		//  "Error: dgrid API: row at index 2 with an expected value of "Value 30 / Store 10 / Changed!" is missing"
		// with the correct widget on the page.

		var overlap;
		config.itemAction = itemAction;

		test.suite(description, function(){
			// Test widgets with only one query: total item count equals item count per query.
			config.overlap = 0;
			config.storeSize = config.storeSizeMuliplier;
			itemTestSuite("OnDemandGrid one query", createGrid, config);
			itemTestSuite("OnDemandList one query", createList, config);

			// Test widgets that make multple query requests: twice as many items as items per query so multiple
			// queries will create multiple observers.
			config.storeSize = config.storeSizeMuliplier * 2;
			for(overlap = 0; overlap <= config.itemOverlapMax; overlap++){
				// Test with OnDemandGrid with varying overlap values
				config.overlap = overlap;
				itemTestSuite("OnDemandGrid multiple queries", createGrid, config);
			}

			for(overlap = 0; overlap <= config.itemOverlapMax; overlap++){
				// Test with OnDemandGrid with varying overlap values
				config.overlap = overlap;
				itemTestSuite("OnDemandList multiple queries", createList, config);
			}
		});
	}

	test.suite("observable grids", function(){
		// Creates test suites that execute the following actions on grids and lists with varying amount of
		// overlap and modifying varying number of items:
		// - modify existing items
		// - remove existing items
		// - add new items before existing items
		// - add new items after existing items

		function findIndex(id, objs){
			for(var i = 0; i < objs.length; i++){
				var obj = objs[i];
				if(obj && obj.id === id){
					return i;
				}
			}
			return -1;
		}

		var modifyAction = function(id, expectedValues){
			var index = findIndex(id, expectedValues);
			var value = expectedValues[index].value + " / Changed!";
			var dataObj = {id: id, value: value};
			widget.store.put(dataObj);
			expectedValues[index] = dataObj;
		};
		modifyAction.actionName = "Modify";

		var removeAction = function(id, expectedValues){
			widget.store.remove(id);
			var index = findIndex(id, expectedValues);
			expectedValues[index].deleted = true;
		};
		removeAction.actionName = "Remove";

		var addBeforeAction = function(id, expectedValues){
			var index = findIndex(id, expectedValues);
			var obj = {id: id - 5, value: expectedValues[index].value + " / Added before!"};
			widget.store.add(obj);
			expectedValues.splice(index, 0, obj);
		};
		addBeforeAction.actionName = "Add before";

		var addAfterAction = function(id, expectedValues){
			var index = findIndex(id, expectedValues);
			var obj = {id: id + 5, value: expectedValues[index].value + " / Added after!"};
			widget.store.add(obj);
			expectedValues.splice(index + 1, 0, obj);
		};
		addAfterAction.actionName = "Add after";

		test.suite("store size a multiple of items per query", function(){
			var config = {
				itemsPerQuery: 3,
				storeSizeMuliplier: 3,
				itemOverlapMax: 2,
				itemsModifiedMax: 2
			};
			itemActionTestSuite("Modify store items", modifyAction, config);
			itemActionTestSuite("Remove store items", removeAction, config);
			itemActionTestSuite("Insert store items before", addBeforeAction, config);
			itemActionTestSuite("Insert store items after", addAfterAction, config);
		});
		test.suite("store size not a multiple of items per query", function(){
			var config = {
				itemsPerQuery: 2,
				storeSizeMuliplier: 3,
				itemOverlapMax: 2,
				itemsModifiedMax: 2
			};
			itemActionTestSuite("Modify store items", modifyAction, config);
			itemActionTestSuite("Remove store items", removeAction, config);
			itemActionTestSuite("Insert store items before", addBeforeAction, config);
			itemActionTestSuite("Insert store items after", addAfterAction, config);
		});
	});
});