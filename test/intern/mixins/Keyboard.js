define([
	"intern!tdd",
	"intern/assert",
	"dgrid/OnDemandList", 
	"dgrid/OnDemandGrid", 
	"dgrid/Keyboard", 
	"dojo/_base/declare", 
	"dojo/on", 
	"dojo/dom-construct",
	"dojo/query", 
	"put-selector/put", 
	"dgrid/test/data/base"
], function(test, assert, OnDemandList, OnDemandGrid, Keyboard, declare, on, domConstruct, query, put){
	var handles = [],
		grid,
		list,
		getFirstTarget = function(grid, anchorClass){
			return query(anchorClass + " .dgrid-cell", grid.domNode)[0] ||
				query(anchorClass + " .dgrid-row", grid.domNode)[0];
		};

	test.suite("Keyboard (Grid + cellNavigation:true)", function(){
		test.before(function(){
			var columns = {
					col1: "Column 1",
					col3: "Column 3",
					col5: "Column 5"
				},
				KeyboardGrid = declare([OnDemandGrid, Keyboard]);
			// create a grid
			grid = new KeyboardGrid({
				store: testStore,
				columns: columns
			});
			// place it and start it up
			domConstruct.place(grid.domNode, document.body, "first");
			grid.startup();
		});

		test.afterEach(function(){
			for(var i=0, len=handles.length; i<len; i++){
				handles[i].remove && handles[i].remove();
			}
		});

		test.after(function(){
			grid.destroy();
		});

		// Tests
		test.test("grid.focus + no args", function(){
			var focused;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				focused = true;
			}));
			// trigger a focus
			grid.focus();
			// Make sure we are good
			assert.strictEqual(focused, true, "dgrid-cellfocusin event triggered on cell focus");
		});

		test.test("grid.focusHeader + no args", function(){
			var focused;
			// listen for a focus in event (header triggers same event)
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				focused = true;
			}));
			// trigger a header focus
			grid.focusHeader();
			// Make sure we are good
			assert.strictEqual(focused, true, "dgrid-cellfocusin event triggered on cell header focus");
		});

		test.test("grid.focus + args", function(){
			var focusedId;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				focusedId = e.cell.row.id;
			}));
			// trigger a header focus with first cell as the target
			grid.focus(getFirstTarget(grid, ".dgrid-content"));
			// make sure we got the right cell
			assert.strictEqual(focusedId, "0", "dgrid-cellfocusin event triggered on cell focus");
		});

		test.test("grid.focusHeader + args", function(){
			var colId;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.cell, "dgrid-cellfocusin event got a non-null cell value");
				colId = e.cell.column.id;
			}));
			// trigger a focus on the first header cell
			grid.focus(getFirstTarget(grid, ".dgrid-header"));
			// make sure we got the right header cell
			assert.strictEqual(colId, "col1", "dgrid-cellfocusin event triggered on cell header focus");
		});

		test.test("dgrid-cellfocusout event", function(){
			var focusedOut;
			// listen for a focus OUT event
			handles.push(on(document.body, "dgrid-cellfocusout", function(e){
				assert.ok(e.cell, "dgrid-cellfocusout event got a non-null cell value");
				focusedOut = true;
			}));
			// call one focus event, followed by a subsequent focus event, 
			// thus triggering a dgrid-cellfocusout event
			grid.focus(getFirstTarget(grid, ".dgrid-content"));
			grid.focus(getFirstTarget(grid, ".dgrid-content"));
			// make sure our handler was called
			assert.strictEqual(focusedOut, true, "dgrid-cellfocusout event triggered on subsequent cell focuses");
		});
	});

	test.suite("Keyboard (Grid + cellNavigation:false)", function(){
		test.before(function(){
			var columns = {
					col1: "Column 1",
					col3: "Column 3",
					col5: "Column 5"
				},
				KeyboardGrid = declare([OnDemandGrid, Keyboard]);
			// create a grid
			grid = new KeyboardGrid({
				store: testStore,
				columns: columns,
				cellNavigation: false
			});
			// place it and start it up
			domConstruct.place(grid.domNode, document.body, "first");
			grid.startup();
		});

		test.afterEach(function(){
			for(var i=0, len=handles.length; i<len; i++){
				handles[i].remove && handles[i].remove();
			}
		});

		test.after(function(){
			grid.destroy();
		});

		// Tests
		test.test("grid.focus + no args", function(){
			var focused;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.row, "dgrid-cellfocusin event got a non-null row value");
				focused = true;
			}));
			// trigger a focus
			grid.focus();
			// Make sure we are good
			assert.strictEqual(focused, true, "dgrid-cellfocusin event triggered on row focus");
		});

		test.test("grid.focus + args", function(){
			var focusedId;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.row, "dgrid-cellfocusin event got a non-null row value");
				focusedId = e.row.id;
			}));
			// trigger a header focus with first row as the target
			grid.focus(getFirstTarget(grid, ".dgrid-content"));
			// make sure we got the right row
			assert.strictEqual(focusedId, "0", "dgrid-cellfocusin event triggered on row focus");
		});

		test.test("dgrid-cellfocusout event", function(){
			var focusedOut;
			// listen for a focus OUT event
			handles.push(on(document.body, "dgrid-cellfocusout", function(e){
				assert.ok(e.row, "dgrid-cellfocusout event got a non-null row value");
				focusedOut = true;
			}));
			// call one focus event, followed by a subsequent focus event, 
			// thus triggering a dgrid-cellfocusout event
			grid.focus(getFirstTarget(grid, ".dgrid-content"));
			grid.focus(getFirstTarget(grid, ".dgrid-content"));
			// make sure our handler was called
			assert.strictEqual(focusedOut, true, "dgrid-cellfocusout event triggered on subsequent row focuses");
		});
	});

	test.suite("Keyboard (List)", function(){
		test.before(function(){
			var columns = {
					col1: "Column 1",
					col3: "Column 3",
					col5: "Column 5"
				},
				KeyboardList = declare([OnDemandList, Keyboard]);
			// create a list
			list = new KeyboardList({
				store: testStore,
				renderRow: function(item){ return put("div", item.col5); }
			});
			// place it and start it up
			domConstruct.place(list.domNode, document.body, "first");
			list.startup();
		});

		test.afterEach(function(){
			for(var i=0, len=handles.length; i<len; i++){
				handles[i].remove && handles[i].remove();
			}
		});

		test.after(function(){
			list.destroy();
		});

		test.test("list.focus + no args", function(){
			var focused;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.row, "dgrid-cellfocusin event got a non-null cell value");
				focused = true;
			}));
			// trigger a focus
			list.focus();
			// Make sure we are good
			assert.strictEqual(focused, true, "dgrid-cellfocusin event triggered on row focus");
		});

		test.test("list.focus + args", function(){
			var focusedId;
			// listen for a focus in event
			handles.push(on(document.body, "dgrid-cellfocusin", function(e){
				assert.ok(e.row, "dgrid-cellfocusin event got a non-null cell value");
				focusedId = e.row.id;
			}));
			// trigger a header focus with first cell as the target
			list.focus(getFirstTarget(list, ".dgrid-content"));
			// make sure we got the right cell
			assert.strictEqual(focusedId, "0", "dgrid-cellfocusin event triggered on cell focus");
		});

		test.test("dgrid-cellfocusout event", function(){
			var focusedOut;
			// listen for a focus OUT event
			handles.push(on(document.body, "dgrid-cellfocusout", function(e){
				assert.ok(e.row, "dgrid-cellfocusout event got a non-null cell value");
				focusedOut = true;
			}));
			// call one focus event, followed by a subsequent focus event, 
			// thus triggering a dgrid-cellfocusout event
			list.focus(getFirstTarget(list, ".dgrid-content"));
			list.focus(getFirstTarget(list, ".dgrid-content"));
			// make sure our handler was called
			assert.strictEqual(focusedOut, true, "dgrid-cellfocusout event triggered on subsequent cell focuses");
		});
	});
});