define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/_base/declare",
	"dojo/on",
	"dojo/query",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"dijit/registry",
	"dijit/form/TextBox",
	"dgrid/Grid",
	"dgrid/OnDemandGrid",
	"dgrid/editor",
	"dgrid/test/data/base"
], function (test, assert, declare, on, query, Memory, Observable, registry, TextBox, Grid, OnDemandGrid, editor) {
	var grid;

	// testOrderedData: global from dgrid/test/data/base.js

	test.suite("editor column plugin", function () {

		test.afterEach(function () {
			if (grid) {
				grid.destroy();
			}
		});

		test.test("canEdit - always-on (instance-per-row) editor", function () {
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


		test.test("canEdit - editOn (shared) editor", function () {
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

			// Note: The "Data 2" column's canEdit method always returns false so none of the following
			// grid.edit calls will return a promise and not editor with receive focus.
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

		function testCanEdit(dfd, columnId){
			var rowCount,
				cell,
				matchedNodes;

			function canEdit(data) {
				return data.order % 2;
			}

			grid = new Grid({
				columns: {
					order: "step",
					name: editor({
						label: "Name",
						editor: "text",
						canEdit: canEdit
					}),
					description: editor({
						label: "Description",
						editor: "text",
						editOn: "click",
						canEdit: canEdit
					})
				}
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex){
				var editPromise;

				function checkAndMoveOn(expectedMatchCount, message){
					matchedNodes = query("input", cell.element);
					assert.strictEqual(expectedMatchCount, matchedNodes.length, message);

					rowIndex++;
					if(rowIndex < rowCount){
						testRow(rowIndex);
					}else{
						dfd.resolve();
					}
				}

				cell = grid.cell(rowIndex, columnId);
				editPromise = grid.edit(cell);
				if(editPromise){
					editPromise.then(dfd.rejectOnError(function(){
						checkAndMoveOn(1, "Cell with canEdit=>true should have an editor element");
					}));
				}else{
					checkAndMoveOn(0, "Cell with canEdit=>false should not have an editor element");
				}
			}
			testRow(0);

			return dfd;
		}

		test.test("canEdit always on editor: suppress on false", function(){
			return testCanEdit(this.async(), "name");
		});

		test.test("canEdit edit-on click editor: suppress on false", function(){
			return testCanEdit(this.async(), "description");
		});

		test.test("destroy editor widgets: native", function () {
			var matchedNodes;

			matchedNodes = query("input");
			assert.strictEqual(0, matchedNodes.length,
				"Before grid is created there should be 0 input elements on the page");

			grid = new Grid({
				columns: {
					order: "step",
					name: editor({
						label: "Name",
						editor: "text"
					}),
					description: editor({
						label: "Description",
						editor: "text",
						editOn: "click"
					})
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);

			matchedNodes = query("input");
			assert.strictEqual(testOrderedData.length, matchedNodes.length,
				"There should be " + testOrderedData.length + " input elements for the grid's editors and there were " +
				matchedNodes.length);

			grid.destroy();

			matchedNodes = query("input");
			assert.strictEqual(0, matchedNodes.length,
				"After grid is destroyed there should be 0 input elements on the page");
		});


		test.test("destroy editor widgets: Dijit", function () {
			assert.strictEqual(0, registry.length,
				"Before grid is created there should be 0 widgets on the page");

			grid = new Grid({
				columns: {
					order: "step",
					name: editor({
						label: "Name",
						editor: TextBox
					}),
					description: editor({
						label: "Description",
						editor: TextBox,
						editOn: "click"
					})
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);

			// Expected is data length + 1 due to widget for editOn editor
			assert.strictEqual(testOrderedData.length + 1, registry.length,
				"There should be " + (testOrderedData.length + 1) + " widgets for the grid's editors");

			grid.destroy();

			assert.strictEqual(0, registry.length,
				"After grid is destroyed there should be 0 widgets on the page");
		});

		test.test("editor widget startup called at appropriate time", function () {
			var assertionMessage;
			var AssertionTextBox = declare(TextBox, {
				startup: function () {
					if (this._started) {
						return;
					}
					assert.isTrue(this.domNode.offsetHeight > 0,
						assertionMessage + ": startup should not be called before widgets are in flow");
					this.inherited(arguments);
				}
			});

			grid = new OnDemandGrid({
				columns: {
					order: "step",
					name: editor({
						label: "Name",
						editor: AssertionTextBox
					}),
					description: editor({
						label: "Description",
						editor: AssertionTextBox,
						editOn: "click"
					})
				},
				store: new Observable(new Memory({
					data: testOrderedData,
					idProperty: "order"
				}))
			});
			document.body.appendChild(grid.domNode);

			assertionMessage = "always-on";
			grid.startup();

			// Assertions will automatically run for always-on editor;
			// test activating an editOn editor and also test updating a row
			assertionMessage = "editOn + edit()";
			grid.edit(grid.cell(1, "description"));
			assertionMessage = "editOn + Observable";
			grid.store.put(grid.store.get(2));
		});

		test.test("editor focus with always on editor", function () {
			var rowCount,
				cell,
				cellEditor,
				dfd = this.async();

			grid = new Grid({
				columns: {
					order: "step",
					name: editor({
						label: "Name",
						editor: "text"
					}),
					description: editor({
						label: "Description",
						editor: "text",
						editOn: "click"
					})
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex){
				// Test calling 'grid.edit()' in an always-on cell
				cell = grid.cell(rowIndex, "name");
				grid.edit(cell).then(dfd.rejectOnError(function(node){
				cellEditor = query("input", cell.element)[0];
					assert.strictEqual(cellEditor, node,
						"edit method's promise should return the active editor");
				assert.strictEqual(cellEditor, document.activeElement,
					"Editing a cell should make the cell's editor active");
					rowIndex++;
					if(rowIndex < rowCount){
						testRow(rowIndex);
					}else{
						dfd.resolve();
					}
				}));
			}
			testRow(0);

			return dfd;
		});

		test.test("editor focus and show event with edit-on click editor", function () {
			var rowCount,
				cell,
				cellEditor,
				dfd = this.async();

			grid = new Grid({
				columns: {
					order: "step",
					name: editor({
						label: "Name",
						editor: "text"
					}),
					description: editor({
						label: "Description",
						editor: "text",
						editOn: "click"
					})
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(testOrderedData);
			rowCount = testOrderedData.length;

			function testRow(rowIndex){
				// Test calling 'grid.edit()' in an always-on cell
				cell = grid.cell(rowIndex, "description");
				// Respond to the "dgrid-editor-show" event to ensure the
				// correct cell has an editor.  This event actually fires
				// synchronously, so we don't need to use this.async.
				on.once(grid.domNode, "dgrid-editor-show", dfd.rejectOnError(function(event){
					assert.strictEqual(cell.element, event.cell.element,
						"The activated cell should be being edited"
					);
				}));
				// Don't move on to the next row until, the editor has received focus and the show event has fired.
				grid.edit(cell).then(dfd.rejectOnError(function(){
					cellEditor = query("input", cell.element)[0];
					assert.strictEqual(cellEditor, document.activeElement,
						"Editing a cell should make the cell's editor active");
					rowIndex++;
					if(rowIndex < rowCount){
						testRow(rowIndex);
					}else{
						dfd.resolve();
					}
				}));
			}
			testRow(0);

			return dfd;
		});
	});
});
