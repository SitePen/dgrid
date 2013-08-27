define([
	"intern!tdd",
	"intern/assert",
	"dgrid/OnDemandList",
	"dgrid/OnDemandGrid",
	"dgrid/Keyboard",
	"dojo/_base/declare",
	"dojo/on",
	"dojo/query",
	"put-selector/put",
	"dgrid/test/data/base"
], function(test, assert, OnDemandList, OnDemandGrid, Keyboard, declare, on, query, put){
	var handles = [],
		columns = {
			col1: "Column 1",
			col3: "Column 3",
			col5: "Column 5"
		},
		grid;
	
	function destroyGrid(){
		grid.destroy();
	}
	
	function removeHandles(){
		for(var i = handles.length; i--;){
			handles[i].remove && handles[i].remove();
		}
		handles = [];
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
		assert.strictEqual(rowId, "0",
			"dgrid-cellfocusin event triggered on first row on focus() call");
	}
	
	function testRowFocusArgs(){
		var rowId;
		// listen for a dgrid-cellfocusin event
		handles.push(on(document.body, "dgrid-cellfocusin", function(e){
			assert.ok(e.row, "dgrid-cellfocusin event got a non-null row value");
			rowId = e.row.id;
		}));
		// trigger a body focus with the second row as the target
		grid.focus(query(".dgrid-row", grid.contentNode)[1]);
		// make sure we got the right row
		assert.strictEqual(rowId, "1",
			"dgrid-cellfocusin event triggered on expected row");
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
			"dgrid-cellfocusout event triggered on expected row");
	}

	test.suite("Keyboard (Grid + cellNavigation:true)", function(){
		test.before(function(){
			grid = new (declare([OnDemandGrid, Keyboard]))({
				store: testStore,
				columns: columns
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(removeHandles);
		test.after(destroyGrid);

		test.test("grid.focus + no args", function(){
			var colId;
			// listen for a dgrid-cellfocusin event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				colId = e.cell.column.id;
			}));
			// trigger a focus with no argument, which should focus the first cell
			grid.focus();
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
			assert.strictEqual(colId, "col1",
				"dgrid-cellfocusin event triggered on first cell on focusHeader() call");
		});

		test.test("grid.focus + args", function(){
			var focusedCell;
			// listen for a dgrid-cellfocusin event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				focusedCell = e.cell;
			}));
			// trigger a body focus with the second cell as the target
			grid.focus(query(".dgrid-cell", grid.contentNode)[1]);
			// make sure our handler was called appropriately
			assert.ok(focusedCell, "dgrid-cellfocusin event fired");
			assert.strictEqual(focusedCell.row.id, "0",
				"dgrid-cellfocusin event triggered on expected row");
			assert.strictEqual(focusedCell.column.id, "col3",
				"dgrid-cellfocusin event triggered on second cell on focus(...) call");
		});

		test.test("grid.focusHeader + args", function(){
			var colId;
			// listen for a dgrid-cellfocusin event (header triggers same event)
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				assert.ok(!e.row, "dgrid-cellfocusin event for header got a falsy row value");
				colId = e.cell.column.id;
			}));
			// trigger a focus on the first header cell
			grid.focus(query(".dgrid-cell", grid.headerNode)[1]);
			// make sure we got the right header cell
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
				"dgrid-cellfocusout event triggered on expected row");
			assert.strictEqual(blurredCell.column.id, "col1",
				"dgrid-cellfocusout event triggered on expected column");
		});
	});

	test.suite("Keyboard (Grid + cellNavigation:false)", function(){
		test.before(function(){
			grid = new (declare([OnDemandGrid, Keyboard]))({
				store: testStore,
				columns: columns,
				cellNavigation: false
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(removeHandles);
		test.after(destroyGrid);

		test.test("grid.focus + no args", testRowFocus);
		test.test("grid.focus + args", testRowFocusArgs);
		test.test("dgrid-cellfocusout event", testRowBlur);
	});

	test.suite("Keyboard (List)", function(){
		test.before(function(){
			grid = new (declare([OnDemandList, Keyboard]))({
				store: testStore,
				renderRow: function(item){ return put("div", item.col5); }
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		test.afterEach(removeHandles);
		test.after(destroyGrid);

		test.test("list.focus + no args", testRowFocus);
		test.test("list.focus + args", testRowFocusArgs);
		test.test("dgrid-cellfocusout event", testRowBlur);
	});
});