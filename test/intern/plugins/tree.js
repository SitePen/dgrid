define([
	"intern!tdd",
	"intern/chai!assert",
	"../../../OnDemandGrid",
	"dgrid/tree",
	"dgrid/util/has-css3",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/aspect",
	"dojo/on",
	"dojo/store/Memory",
	"put-selector/put"
], function(test, assert, OnDemandGrid, tree, has, lang, Deferred, aspect, on, Memory, put){

	var grid,
		testDelay = 15,
		hasTransitionEnd = has("transitionend");

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
		test.suite("large family", function(){

			test.beforeEach(function(){
				var data = [], i, k;
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

				var store = new Memory({
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
				});

				grid = new OnDemandGrid({
					store: store,
					columns: [
						tree({ label: "id", field: "id" }),
						{ label: "value", field: "value"}
					]
				});
				put(document.body, grid.domNode);
				grid.startup();

				// Firefox in particular seems to skip transitions sometimes
				// if we don't wait a bit after creating and placing the grid
				return wait();
			});

			test.afterEach(function(){
				grid.destroy();
				grid = null;
			});

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
	});
});