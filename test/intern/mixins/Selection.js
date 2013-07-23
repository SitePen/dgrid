require([
	"intern!tdd",
	"intern/assert",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"dgrid/Grid",
	"dgrid/OnDemandGrid",
	"dgrid/Selection",
	"dgrid/CellSelection",
	"dgrid/extensions/Pagination",
	"dojo/domReady!"
], function(test, assert, declare, arrayUtil, lang, Memory, Observable, Grid, OnDemandGrid, Selection, CellSelection, Pagination){
	
	var mixins = {
			Selection: Selection,
			CellSelection: CellSelection
		},
		notificationTests = {};
	
	function _createTestData(size){
		var data = [], aCode = "A".charCodeAt(0);
		size = size || 15;
		for(i = 0; i < size; i++){
			data.push({
				id: i,
				first: "First" + String.fromCharCode(aCode + (i % 26)),
				last: "Last" + String.fromCharCode(aCode + 25 - (i % 26))
			});
		}
		return data;
	}
	
	function countProperties(object){
		var count = 0,
			key;
		
		for(key in object){
			if(object.hasOwnProperty(key)){
				count++;
			}
		}
		return count;
	}
	
	function getColumns(){
		return {
			first: "First Name",
			last: "Last Name"
		};
	}
	
	arrayUtil.forEach(["Selection", "CellSelection"], function(name){
		var SelectionMixin = mixins[name];
		notificationTests[name + " + update"] = function(){
			var store = Observable(new Memory({
					data: _createTestData()
				})),
				grid = new (declare([OnDemandGrid, SelectionMixin]))({
					columns: getColumns(),
					store: store,
					sort: "id"
				});
			
			document.body.appendChild(grid.domNode);
			grid.startup();
			
			// Using this long-winded approach for the purposes
			// of the same logic working for both Selection and
			// CellSelection
			grid.select(grid.row(3));
			grid.select(grid.row(4));
			grid.select(grid.row(5));
			grid.select(grid.row(6));
			grid.select(grid.row(7));
			
			var selection = grid.selection;
			assert.strictEqual(countProperties(selection), 5,
				"Selection contains the expected number of items");
			assert.ok(selection[3] && selection[4] && selection[5] &&
				selection[6] && selection[7],
				"Selection contains the expected items");
			
			store.put({ id: 5, first: "Updated First", last: "Updated Last"});
			store.put({ id: 99, first: "New First", last: "New Last"});
			
			assert.ok(selection[3] && selection[4] && selection[5] &&
				selection[6] && selection[7],
				"Selection still contains the same items");
			
			assert.ok(!selection[99],
				"Selection does not contain newly-added item");
			
			store.remove(5);
			assert.ok(selection[3] && selection[4] && !selection[5] &&
				selection[6] && selection[7],
				"Item 5 has been removed from the selection");
			
			// Calling remove row does not notify the store so the selection is not updated.
			grid.row(4).remove();
			assert.ok(selection[3] && selection[4] && !selection[5] &&
				selection[6] && selection[7],
				"Selection is unchanged when calling removeRow directly on a store-backed grid");
			
			grid.destroy();
		};
		
		notificationTests[name + " + update + no store"] = function(){
			var grid = new (declare([Grid, SelectionMixin]))({
				columns: getColumns()
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(_createTestData());
			
			// Using this long-winded approach for the purposes
			// of the same logic working for both Selection and
			// CellSelection
			grid.select(grid.row(3));
			grid.select(grid.row(4));
			grid.select(grid.row(5));
			grid.select(grid.row(6));
			grid.select(grid.row(7));
			
			var selection = grid.selection;
			assert.strictEqual(countProperties(selection), 5,
				"Selection contains the expected number of items");
			assert.ok(selection[3] && selection[4] && selection[5] &&
				selection[6] && selection[7],
				"Selection contains the expected items");
			
			grid.row(4).remove();
			assert.strictEqual(countProperties(selection), 4,
				"Selection contains 1 fewer items after removal of selected item");
			assert.ok(selection[3] && !selection[4] && selection[5] &&
				selection[6] && selection[7],
				"Item 4 has been removed from the selection");
			
			grid.row(1).remove();
			assert.strictEqual(countProperties(selection), 4,
				"Selection is unchanged after removal of unselected item");
			assert.ok(selection[3] && !selection[4] && selection[5] &&
				selection[6] && selection[7],
				"Selection is unchanged after removal of unselected item");
			
			grid.row(3).remove();
			assert.strictEqual(countProperties(selection), 3,
				"Selection contains 1 fewer items after removal of selected item");
			assert.ok(!selection[3] && !selection[4] && selection[5] &&
				selection[6] && selection[7],
				"Item 3 has been removed from the selection");
			
			grid.row(5).remove();
			grid.row(6).remove();
			grid.row(7).remove();
			assert.strictEqual(countProperties(selection), 0,
				"No items are selected after all selected items have been removed");
			
			grid.destroy();
		};
		
		notificationTests[name + " + update + store + paging"] = function(){
			// Create a selection, trigger paging, notify
			var store = Observable(new Memory({
					data: _createTestData(100)
				})),
				grid = new (declare([Grid, SelectionMixin, Pagination]))({
					store: store,
					columns: getColumns()
				});
			
			document.body.appendChild(grid.domNode);
			grid.startup();
			
			function checkSelected(ids){
				var selection = grid.selection;
				assert.strictEqual(countProperties(selection), ids.length,
					"Selection contains the expected number of items");
				assert.ok(arrayUtil.every(ids, function(id){
					return id in selection;
				}), "Selection contains the expected items");
			}

			var initSelection = [3, 4, 5, 23, 24, 25];
			arrayUtil.forEach(initSelection, function(id){
				grid.select(grid.row(id));
			});
			checkSelected(initSelection);

			grid.gotoPage(4);
			checkSelected(initSelection);

			grid.gotoPage(1);
			store.put({ id: 4, first: "Updated First", last: "Updated Last"});
			checkSelected(initSelection);

			store.put({ id: 24, first: "Updated First", last: "Updated Last"});
			checkSelected(initSelection);

			store.put({ id: 1999, first: "New First", last: "New Last"});
			checkSelected(initSelection);

			store.remove(2);
			checkSelected(initSelection);

			store.remove(3);
			checkSelected([4, 5, 23, 24, 25]);

			store.remove(25);
			checkSelected([4, 5, 23, 24]);
			
			grid.destroy();
		};
	});
	
	test.suite("Selection update handling", function(){
		for(var name in notificationTests){
			test.test(name, notificationTests[name]);
		}
	});
});