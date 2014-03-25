define([
	"intern!tdd",
	"intern/chai!assert",
	"dgrid/OnDemandGrid",
	"dgrid/tree",
	"dgrid/util/has-css3",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/aspect",
	"dojo/on",
	"put-selector/put",
	"dgrid/test/data/createSyncHierarchicalStore"
], function(test, assert, OnDemandGrid, tree, has, lang, Deferred, aspect, on, put, createSyncHierarchicalStore){

	var grid,
		testDelay = 15,
		hasTransitionEnd = has("transitionend");

	function createGrid(){
		var data = [],
			store,
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
					parent: parentId,
					value: "Child " + k
				});
			}
		}

		store = createSyncHierarchicalStore({
			data: data,
			mayHaveChildren: function(parent){
				return parent.parent == null;
			}
		});
		
		grid = new OnDemandGrid({
			sort: "id",
			collection: store,
			columns: [
				tree({ label: "id", field: "id" }),
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
	var expand = hasTransitionEnd ? function(grid, id){
		var dfd = new Deferred();

		on.once(grid, hasTransitionEnd, function(){
			dfd.resolve();
		});

		grid.expand(id);
		return dfd.promise;
	} : function(grid, id){
		var dfd = new Deferred();
		grid.expand(id);
		dfd.resolve();
		return dfd.promise;
	};

	function scrollToEnd(grid){
		var dfd = new Deferred(),
			handle;

		handle = aspect.after(grid, "renderArray", function(){
			handle.remove();
			dfd.resolve();
		});

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
				return expand(grid, 0).then(function(){
					testRowExists("0:0");
					testRowExists("0:99", false);
				});
			});

			test.test("expand first row + scroll to bottom", function(){
				return expand(grid, 0).then(function(){
					return scrollToEnd(grid);
				}).then(function(){
					testRowExists("0:0");
					testRowExists("0:99");
				});
			});

			test.test("expand last row", function(){
				return expand(grid, 4).then(function(){
					testRowExists("4:0");
					testRowExists("4:99", false);
				});
			});

			test.test("expand last row + scroll to bottom", function(){
				return expand(grid, 4).then(function(){
					return scrollToEnd(grid);
				}).then(function(){
					testRowExists("4:0");
					testRowExists("4:99");
				});
			});

			test.test("expand first and last rows + scroll to bottom", function(){
				return expand(grid, 0).then(function(){
					return scrollToEnd(grid);
				}).then(function(){
					return expand(grid, 4);
				}).then(function(){
					return scrollToEnd(grid);
				}).then(function(){
					testRowExists("4:0");
					testRowExists("4:99");
				});
			});
		});

		test.suite("tree + observable", function(){
			test.beforeEach(createGrid);
			test.afterEach(destroyGrid);

			test.test("child modification", function(){
				return expand(grid, 0).then(function(){
					testRowExists("0:0");
					assert.doesNotThrow(function(){
						grid.collection.put({
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