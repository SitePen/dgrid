define([
	"intern!tdd",
	"intern/chai!assert",
	"dgrid/OnDemandGrid",
	"dgrid/editor",
	"dgrid/tree",
	"dgrid/util/has-css3",
	"dgrid/util/misc",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/dom-style",
	"dojo/on",
	"dojo/query",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"put-selector/put"
], function(test, assert, OnDemandGrid, editor, tree, has, miscUtil, lang, Deferred, domStyle, on, query, Memory, Observable, put){

	var grid,
		testDelay = 15,
		hasTransitionEnd = has("transitionend");

	function createGrid(options){
		var data = [],
			store,
			treeColumnOptions,
			editorPlugin,
			i,
			k;

		for(i = 0; i < 5; i++){
			var parentId = "" + i;
			data.push({
				id: parentId,
				value: "Root " + i
			});
			for(k = 0; k < 100; k++){
				data.push({
					id: i + ":" + k,
					parentId: parentId,
					value: "Child " + k
				});
			}
		}

		store = new Observable(new Memory({
			data: data,
			getChildren: function(parent, options){
				return this.query(
					lang.mixin({}, options.originalQuery || null, { parentId: parent.id }), options);
			},
			mayHaveChildren: function(parent){
				return parent.parentId == null;
			},
			query: function(query, options){
				query = query || {};
				options = options || {};

				if(!query.parentId && !options.deep){
					query.parentId = undefined;
				}
				return this.queryEngine(query, options)(this.data);
			}
		}));

		treeColumnOptions = {
			label: "id",
			field: "id"
		};

		if(options && options.useEditor){
			treeColumnOptions = editor(treeColumnOptions);
		}

		if(options && options.treeColumnOptions){
			lang.mixin(treeColumnOptions, options.treeColumnOptions);
		}

		grid = new OnDemandGrid({
			sort: "id",
			store: store,
			columns: [
				tree(treeColumnOptions),
				{ label: "value", field: "value"}
			]
		});
		put(document.body, grid.domNode);
		grid.startup();
	}

	function destroyGrid(){
		grid.destroy();
		grid = null;
	}

	function testRowExists(dataItemId, exists){
		// Tests existence of a row for a given item ID;
		// if `exists` is false, tests for nonexistence instead
		exists = exists !== false;
		assert[exists ? "isNotNull" : "isNull"](document.getElementById(grid.id + "-row-" + dataItemId),
				"A row for " + dataItemId + " should " + (exists ? "" : "not ") + "exist in the grid.");
	}

	function wait(delay){
		// Returns a promise resolving after the given number of ms (or testDelay by default)
		var dfd = new Deferred();
		setTimeout(function(){
			dfd.resolve();
		}, delay || testDelay);
		return dfd.promise;
	}

	// Define a function returning a promise resolving once children are expanded.
	// On browsers which support CSS3 transitions, this occurs when transitionend fires;
	// otherwise it occurs immediately.
	var expand = hasTransitionEnd ? function(id){
		var dfd = new Deferred();

		on.once(grid, hasTransitionEnd, function(){
			dfd.resolve();
		});

		grid.expand(id);
		return dfd.promise;
	} : function(id){
		var dfd = new Deferred();
		grid.expand(id);
		dfd.resolve();
		return dfd.promise;
	};

	function scrollToEnd(){
		var dfd = new Deferred(),
			handle;

		handle = on.once(grid.bodyNode, "scroll", miscUtil.debounce(function(){
			dfd.resolve();
		}));

		grid.scrollTo({ y: grid.bodyNode.scrollHeight });

		return dfd.promise;
	}

	test.suite("tree", function(){
		test.suite("large family expansion", function(){

			test.beforeEach(function(){
				createGrid();

				// Firefox in particular seems to skip transitions sometimes
				// if we don't wait a bit after creating and placing the grid
				return wait();
			});

			test.afterEach(destroyGrid);

			test.test("expand first row", function(){
				return expand(0)
					.then(function(){
						testRowExists("0:0");
						testRowExists("0:99", false);
					});
			});

			test.test("expand first row + scroll to bottom", function(){
				return expand(0)
					.then(scrollToEnd)
					.then(function(){
						testRowExists("0:0");
						testRowExists("0:99");
					});
			});

			test.test("expand last row", function(){
				return expand(4).then(function(){
					testRowExists("4:0");
					testRowExists("4:99", false);
				});
			});

			test.test("expand last row + scroll to bottom", function(){
				return expand(4)
					.then(scrollToEnd)
					.then(function(){
						testRowExists("4:0");
						testRowExists("4:99");
					});
			});

			test.test("expand first and last rows + scroll to bottom", function(){
				return expand(0)
					.then(scrollToEnd)
					.then(function(){
						return expand(4);
					})
					.then(scrollToEnd)
					.then(function(){
						testRowExists("4:0");
						testRowExists("4:99");
					});
			});

			test.test("expand hidden", function(){
				var dfd = this.async(1000);

				grid.domNode.style.display = "none";
				grid.expand(0);
				grid.domNode.style.display = "block";

				// Since the grid is not displayed the expansion will occur without a transitionend event
				// However, DOM updates from the expand will not complete within the current stack frame
				setTimeout(dfd.callback(function(){
					var connected = grid.row(0).element.connected;
					assert.isTrue(connected && connected.offsetHeight > 0,
						"Node should be expanded with non-zero height");
				}), 0);
			});

			// Test goal: ensure the expando icon is displayed consistent with the results of the store's
			// "mayHaveChildren" method.
			// Notes:
			// * The store created in "createGrid" has a "mayHaveChildren" that returns true for nodes with no parentId
			// * The expando icon (.dgrid-expando-icon) is always rendered, it is not visible if it lacks the class
			//   ".ui-icon"
			test.test("mayHaveChildren", function(){
				var rowObject;
				var expandoNode;
				var i;
				var j;

				for(i = 0; i < 5; i++){
					rowObject = grid.row(i);
					expandoNode = query(".dgrid-expando-icon.ui-icon", rowObject.element)[0];
					assert.isDefined(expandoNode, "Parent node should have an expando icon; node id = " + i);

					grid.expand(i, true, true);

					for(k = 0; k < 2; k++){
						rowObject = grid.row(i + ":" + k);
						expandoNode = query(".dgrid-expando-icon.ui-icon", rowObject.element)[0];
						assert.isUndefined(expandoNode,
								"Child node should not have an expando icon; node id = " + i + ":" + k);
					}

					grid.expand(i, false, true);
				}
			});

			// Test goal: ensure that rows are correctly expanded/collapsed on grid render in accordance with the
			// column's "shouldExpand" method
			test.test("shouldExpand", function(){
				var columns;
				var shouldExpand;
				var i;

				columns = grid.get("columns");
				columns[0].shouldExpand = function(rowObject){
					var shouldExpand = false;

					if(rowObject.data.parentId === undefined){
						shouldExpand = !(rowObject.id % 2);
					}

					return shouldExpand;
				};
				grid.set("columns", columns);

				for(i = 0; i < 5; i++){
					shouldExpand = !(i % 2);

					if(shouldExpand){
						assert.isTrue(grid._expanded[i], "Row " + i + " should be expanded");
					}
					else{
						assert.isUndefined(grid._expanded[i], "Row " + i + " should not be expanded");
					}
				}
			});

			// Test goal: ensure that a custom "renderExpando" column method produces the expected DOM structure
			test.test("renderExpando", function(){
				var columns;
				var rowObject;
				var expandoNode;
				var shouldExpand;
				var i;

				columns = grid.get("columns");
				columns[0].renderExpando = function(level, hasChildren, expanded, object){

					// * Adds the "test-expando" class
					// * Floats the expando at the opposite end of the cell
					var node = tree.defaultRenderExpando.apply(this, arguments);
					put(node, ".test-expando");
					domStyle.set(node, "float", "right");
					return node;
				};
				grid.set("columns", columns);

				for(i = 0; i < 5; i++){
					rowObject = grid.row(i);
					expandoNode = query(".dgrid-expando-icon.ui-icon", rowObject.element)[0];
					assert.isDefined(expandoNode, "Row " + i + " should have an expando icon");
					assert.include(expandoNode.className, "test-expando",
							"Row " + i + "'s expando icon should have the class \"test-expando\"");
				}
			});

			// Test goal: ensure the expando node is still rendered when the column has a custom "renderCell" method
			test.test("renderCell", function(){
				var rowObject;
				var expandoNode;
				var shouldExpand;
				var i;

				grid.destroy();

				createGrid({
					treeColumnOptions: {
						renderCell: function(rowObject, cellValue, cellNode){
							return put("div.testRenderCell", cellValue);
						}
					}
				});

				for(i = 0; i < 5; i++){
					rowObject = grid.row(i);
					expandoNode = query(".dgrid-expando-icon.ui-icon", rowObject.element)[0];
					assert.isDefined(expandoNode, "Row " + i + " should have an expando node");
				}

				grid.destroy();

				createGrid({
					treeColumnOptions: {
						renderCell: function(rowObject, cellValue, cellNode){
							put(cellNode, ".testRenderCell", cellValue);
						}
					}
				});

				for(i = 0; i < 5; i++){
					rowObject = grid.row(i);
					expandoNode = query(".dgrid-expando-icon.ui-icon", rowObject.element)[0];
					assert.isDefined(expandoNode, "Row " + i + " should have an expando node");
				}
			});

			// Test goal: ensure the expando node is still rendered with the editor plugin
			// Note: ordering is important: tree(editor()), not editor(tree())
			test.test("renderCell with editor", function(){
				var rowObject;
				var expandoNode;
				var inputNode;
				var i;

				grid.destroy();

				createGrid({
					useEditor: true
				});

				for(i = 0; i < 5; i++){
					rowObject = grid.row(i);
					expandoNode = query(".dgrid-expando-icon.ui-icon", rowObject.element)[0];
					assert.isDefined(expandoNode, "Row " + i + " should have an expando node");
					inputNode = query(".dgrid-input", rowObject.element)[0];
					assert.isDefined(inputNode, "Row " + i + " should have an input node");
				}
			});
		});

		test.suite("tree + observable", function(){
			test.beforeEach(createGrid);
			test.afterEach(destroyGrid);

			test.test("child modification", function(){
				return expand(0).then(function(){
					testRowExists("0:0");
					assert.doesNotThrow(function(){
						grid.store.put({
							id: "0:0",
							value: "Modified",
							parentId: "0"
						});
					}, null, 'Modification of child should not throw error');
				});
			});
		});
	});
});