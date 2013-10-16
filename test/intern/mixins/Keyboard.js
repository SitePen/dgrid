define([
	"intern!tdd",
	"intern/chai!assert",
	"dgrid/OnDemandList",
	"dgrid/OnDemandGrid",
	"dgrid/Keyboard",
	"dojo/_base/declare",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/query",
	"put-selector/put",
	"dgrid/test/data/base"
], function(test, assert, OnDemandList, OnDemandGrid, Keyboard, declare, domConstruct, on, query, put){
	var handles = [],
		item = testStore.get(1),
		grid, button;
	
	// Common functions run after each test and suite
	
	function removeHandles(){
		for(var i = handles.length; i--;){
			handles[i].remove && handles[i].remove();
		}
		handles = [];
	}
	
	function destoryGrid(){
		removeHandles();
		// Destroy list or grid
		grid.destroy();
		// Restore item that was removed for focus retention test
		testStore.put(item);

		if(button){
			domConstruct.destroy(button);
			button = null;
		}
	}

	function makeButton(){
		button = domConstruct.place("<button>Click</button>", document.body);
	}
	
	// Common test functions for grid w/ cellNavigation: false and list
	
	function testRowFocus(){
		var rowId;
		// listen for a dgrid-cellfocusin event
		handles.push(on(document.body, "dgrid-cellfocusin", function(e){
			assert.ok(e.row, "dgrid-cellfocusin event got a non-null row value");
			rowId = e.row.id;
		}));
		// trigger a focus with no argument, which should focus the first row
		grid.focus();
		// XXX: dgrid/List#row returns string ID when looking up DOM node
		assert.strictEqual(document.activeElement, query(".dgrid-row", grid.contentNode)[0],
			"focus() targeted the first row");
		assert.strictEqual(rowId, "0",
			"dgrid-cellfocusin event triggered on first row on focus() call");
	}
	
	function testRowFocusArgs(){
		var rowId, target;
		// listen for a dgrid-cellfocusin event
		handles.push(on(document.body, "dgrid-cellfocusin", function(e){
			assert.ok(e.row, "dgrid-cellfocusin event got a non-null row value");
			rowId = e.row.id;
		}));
		// trigger a body focus with the second row as the target
		target = query(".dgrid-row", grid.contentNode)[1];
		grid.focus(target);
		// make sure we got the right row
		assert.strictEqual(document.activeElement, target,
			"focus(...) targeted the expected row");
		assert.strictEqual(rowId, "1",
			"dgrid-cellfocusin event triggered on expected row 1: " + rowId);
	}
	
	function testRowBlur(){
		var blurredRow,
			targets = query(".dgrid-row", grid.contentNode);
		
		// call one focus event, followed by a subsequent focus event, 
		// thus triggering a dgrid-cellfocusout event
		grid.focus(targets[0]);
		
		// listen for a dgrid-cellfocusout event
		handles.push(on(document.body, "dgrid-cellfocusout", function(e){
			blurredRow = e.row;
			assert.ok(blurredRow, "dgrid-cellfocusout event got a non-null row value");
		}));
		
		grid.focus(targets[1]);
		// make sure our handler was called
		assert.strictEqual(blurredRow && blurredRow.id, "0",
			"dgrid-cellfocusout event triggered on expected row 0: " + (blurredRow && blurredRow.id));
	}
	
	function testRowUpdate(){
		var element, elementId;
		// Focus a row based on a store ID, then issue an update and make sure
		// the same id is still focused
		grid.focus(1);
		
		element = document.activeElement;
		assert.ok(element && element.className && element.className.indexOf("dgrid-row") > -1,
			"focus(id) call focused a row");
		
		elementId = element.id;
		grid.store.put(item);
		assert.notStrictEqual(element, document.activeElement,
			"A different DOM element is focused after updating the item");
		assert.strictEqual(elementId, document.activeElement.id,
			"The item's new row is focused after updating the item");
	}
	
	function testRowRemove(){
		var dfd = this.async(1000),
			element,
			nextElement;
		
		// Focus a row based on a store ID, then remove the item and
		// make sure the corresponding cell is eventually focused
		grid.focus(1);
		
		element = document.activeElement;
		assert.ok(element && element.className && element.className.indexOf("dgrid-row") > -1,
			"focus(id) call focused a row");
		
		nextElement = element.nextSibling;
		grid.store.remove(1);
		
		// The logic responsible for moving to the next row runs on next turn,
		// since it operates as a fallback that is run only if a replacement
		// is not immediately inserted.  Therefore we need to execute our
		// assertions on the next turn as well.
		setTimeout(dfd.callback(function(){
			assert.strictEqual(nextElement, document.activeElement,
				"The next row is focused after removing the item");
		}), 0);
		
		return dfd;
	}
	
	function registerRowTests(name) {
		test.afterEach(removeHandles);
		test.after(destoryGrid);

		test.test(name + ".focus + no args", testRowFocus);
		test.test(name + ".focus + args", testRowFocusArgs);
		test.test("dgrid-cellfocusout event", testRowBlur);
		test.test(name + ".focus + item update", testRowUpdate);
		test.test(name + ".focus + item removal", testRowRemove);
	}

	function testFocusInOut(grid, focusFn){
		var focusInCount = 0,
			focusOutCount = 0;

		makeButton();

		// listen for a dgrid focus events
		handles.push(on(document.body, "dgrid-cellfocusin", function(){
			focusInCount++;
		}));
		handles.push(on(document.body, "dgrid-cellfocusout", function(){
			focusOutCount++;
		}));

		focusFn.call(grid);
		assert.strictEqual(focusInCount, 1,
			"dgrid-cellfocusin event occurred once: " + focusInCount);
		assert.strictEqual(focusOutCount, 0,
			"dgrid-cellfocusout event occurred none: " + focusOutCount);

		button.focus();
		assert.strictEqual(focusInCount, 1,
			"dgrid-cellfocusin event occurred once: " + focusInCount);
		assert.strictEqual(focusOutCount, 1,
			"dgrid-cellfocusout event occurred once: " + focusOutCount);

		focusFn.call(grid);
		assert.strictEqual(focusInCount, 2,
			"dgrid-cellfocusin event occurred twice: " + focusInCount);
		assert.strictEqual(focusOutCount, 1,
			"dgrid-cellfocusout event occurred once: " + focusOutCount);
	}

	test.suite("Keyboard (Grid + cellNavigation:true)", function(){
		test.beforeEach(function(){
			grid = new (declare([OnDemandGrid, Keyboard]))({
				columns: {
					col1: "Column 1",
					col3: "Column 3",
					col5: "Column 5"
				},
				sort: "id",
				store: testStore
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});
		test.afterEach(destoryGrid);

		test.test("grid.cellNavigation default value", function(){
			assert.ok(grid.cellNavigation, "Grid cellNavigation is true by default");
		});

		test.test("grid.cellNavigation default value", function(){
			assert.ok(grid.cellNavigation, "Grid cellNavigation is true by default");
		});

		test.test("grid.focus + no args", function(){
			var colId;
			// listen for a dgrid-cellfocusin event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				colId = e.cell.column.id;
			}));
			// trigger a focus with no argument, which should focus the first cell
			grid.focus();
			assert.strictEqual(document.activeElement, query(".dgrid-cell", grid.contentNode)[0],
				"focus() targeted the first cell");
			assert.strictEqual(colId, "col1",
				"dgrid-cellfocusin event triggered on first cell on focus() call");
		});

		test.test("grid.focusHeader + no args", function(){
			var colId;
			// listen for a dgrid-cellfocusin event (header triggers same event)
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				assert.ok(!e.row, "dgrid-cellfocusin event for header got a falsy row value");
				colId = e.cell.column.id;
			}));
			// trigger a header focus with no argument, which should focus the first cell
			grid.focusHeader();
			assert.strictEqual(document.activeElement, query(".dgrid-cell", grid.headerNode)[0],
				"focus() targeted the first header cell");
			assert.strictEqual(colId, "col1",
				"dgrid-cellfocusin event triggered on first cell on focusHeader() call");
		});

		test.test("grid.focus + args", function(){
			var focusedCell, target;
			// listen for a dgrid-cellfocusin event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				focusedCell = e.cell;
			}));
			// trigger a body focus with the second cell as the target
			target = query(".dgrid-cell", grid.contentNode)[1];
			grid.focus(target);
			assert.strictEqual(document.activeElement, target,
				"focus(...) targeted the expected cell");
			assert.ok(focusedCell, "dgrid-cellfocusin event fired");
			assert.strictEqual(focusedCell.row.id, "0",
				"dgrid-cellfocusin event triggered on expected row 0: " + focusedCell.row.id);
			assert.strictEqual(focusedCell.column.id, "col3",
				"dgrid-cellfocusin event triggered on second cell on focus(...) call");
		});

		test.test("grid.focusHeader + args", function(){
			var colId, target;
			// listen for a dgrid-cellfocusin event (header triggers same event)
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				assert.ok(!e.row, "dgrid-cellfocusin event for header got a falsy row value");
				colId = e.cell.column.id;
			}));
			// trigger a focus on the first header cell
			target = query(".dgrid-cell", grid.headerNode)[1];
			grid.focus(target);
			assert.strictEqual(document.activeElement, target,
				"focusHeader(...) targeted the expected cell");
			assert.strictEqual(colId, "col3", "dgrid-cellfocusin event triggered on expected header cell");
		});

		test.test("dgrid-cellfocusout event", function(){
			var blurredCell,
				targets = query(".dgrid-cell", grid.contentNode);
			
			// call one focus event, followed by a subsequent focus event, 
			// thus triggering a dgrid-cellfocusout event
			grid.focus(targets[0]);
			
			// listen for a dgrid-cellfocusout event
			handles.push(on(document.body, "dgrid-cellfocusout", function(e){
				blurredCell = e.cell;
				assert.ok(blurredCell, "dgrid-cellfocusout event got a non-null cell value");
			}));
			
			grid.focus(targets[1]);
			// make sure our handler was called appropriately
			assert.ok(blurredCell, "dgrid-cellfocusout event fired");
			assert.strictEqual(blurredCell.row.id, "0",
				"dgrid-cellfocusout event triggered on expected row 0: " + blurredCell.row.id);
			assert.strictEqual(blurredCell.column.id, "col1",
				"dgrid-cellfocusout event triggered on expected column col1: " + blurredCell.column.id);
		});

		test.test("grid.focus, repeated", function(){
			var focusInCount = 0,
				focusOutCount = 0,
				target;

			// listen for a dgrid focus events
			handles.push(on(document.body, "dgrid-cellfocusin", function(){
				focusInCount++;
			}));
			handles.push(on(document.body, "dgrid-cellfocusout", function(){
				focusOutCount++;
			}));
			// Looking for two focus-in events and only one focus out event.
			grid.focus();

			// trigger a body focus with the second cell as the target
			target = query(".dgrid-cell", grid.contentNode)[1];
			grid.focus(target);
			grid.focus(target);
			grid.focus(target);
			assert.strictEqual(focusInCount, 2,
				"dgrid-cellfocusin event occurred twice: " + focusInCount);
			assert.strictEqual(focusOutCount, 1,
				"dgrid-cellfocusout event occurred only once: " + focusOutCount);
		});

		test.test("grid.focusHeader, repeated", function(){
			var focusInCount = 0,
				focusOutCount = 0,
				target;

			// listen for a dgrid focus events
			handles.push(on(document.body, "dgrid-cellfocusin", function(){
				focusInCount++;
			}));
			handles.push(on(document.body, "dgrid-cellfocusout", function(){
				focusOutCount++;
			}));
			// Looking for two focus-in events and only one focus out event.
			grid.focus();

			// trigger a focus on the first header cell
			target = query(".dgrid-cell", grid.headerNode)[1];
			grid.focus(target);
			grid.focus(target);
			grid.focus(target);
			assert.strictEqual(focusInCount, 2,
				"dgrid-cellfocusin event occurred twice: " + focusInCount);
			assert.strictEqual(focusOutCount, 1,
				"dgrid-cellfocusout event occurred only once: " + focusOutCount);
		});

		test.test("grid.focus + item update", function(){
			var element, elementId;
			// Focus a row based on a store ID + column ID,
			// then issue an update and make sure the same id is still focused
			grid.focus(grid.cell(1, "col1"));
			
			element = document.activeElement;
			assert.ok(element && element.className && element.className.indexOf("dgrid-cell") > -1,
				"focus(id) call focused a cell");
			
			elementId = element.id;
			grid.store.put(item);
			assert.notStrictEqual(element, document.activeElement,
				"A different DOM element is focused after updating the item");
			assert.strictEqual(grid.cell(1, "col1").element, document.activeElement,
				"The item's new cell is focused after updating the item");
		});
		
		test.test("grid.focus + item removal", function(){
			var dfd = this.async(1000),
				element,
				nextElement;
			
			// Focus a cell based on a store ID, then remove the item and
			// make sure the corresponding cell is eventually focused
			grid.focus(grid.cell(1, "col1"));
			
			element = document.activeElement;
			assert.ok(element && element.className && element.className.indexOf("dgrid-cell") > -1,
				"focus(id) call focused a cell");
			
			nextElement = grid.cell(2, "col1").element;
			grid.store.remove(1);
			
			// The logic responsible for moving to the next row runs on next turn,
			// since it operates as a fallback that is run only if a replacement
			// is not immediately inserted.  Therefore we need to execute our
			// assertions on the next turn as well.
			setTimeout(dfd.callback(function(){
				assert.strictEqual(nextElement, document.activeElement,
					"The next row is focused after removing the item");
			}), 0);
			
			return dfd;
		});

		test.test("grid.focus, in and out of grid", function(){
			testFocusInOut(grid, grid.focus);
		});

		test.test("grid.focusHeader, in and out of grid", function(){
			testFocusInOut(grid, grid.focusHeader);
		});
	});

	test.suite("Keyboard (Grid + cellNavigation:false)", function(){
		test.beforeEach(function(){
			grid = new (declare([OnDemandGrid, Keyboard]))({
				cellNavigation: false,
				columns: {
					col1: "Column 1",
					col3: "Column 3",
					col5: "Column 5"
				},
				sort: "id",
				store: testStore
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});
		test.afterEach(destoryGrid);

		test.test("grid.focus, in and out of grid", function(){
			testFocusInOut(grid, grid.focus);
		});

		test.test("grid.focusHeader, in and out of grid", function(){
			testFocusInOut(grid, grid.focusHeader);
		});

		test.test("grid.focus, in and out of grid", function(){
			testFocusInOut(grid, grid.focus);
		});

		test.test("grid.focusHeader, in and out of grid", function(){
			testFocusInOut(grid, grid.focusHeader);
		});

		registerRowTests("grid");
	});

	test.suite("Keyboard (List)", function(){
		test.beforeEach(function(){
			grid = new (declare([OnDemandList, Keyboard]))({
				sort: "id",
				store: testStore,
				renderRow: function(item){ return put("div", item.col5); }
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});
		test.afterEach(destoryGrid);

		registerRowTests("list");
	});
});