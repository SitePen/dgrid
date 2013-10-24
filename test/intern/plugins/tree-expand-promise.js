define([
	"intern!tdd",
	"intern/chai!assert",
	"dgrid/OnDemandGrid",
	"dgrid/tree",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/on",
	"dojo/store/Memory",
	"dojo/store/util/QueryResults",
	"dojo/query"
], function(test, assert, OnDemandGrid, tree, declare, lang, Deferred, on,
		Memory, QueryResults, query){

	test.suite("tree (expand + promise)", function(){
		var grid,
			TreeStore = declare(Memory, {
				// A memory store with methods to support a tree
				getChildren: function(parent, options){
					// Support persisting the original query via options.originalQuery
					// so that child levels will filter the same way as the root level
					return this.query(
						lang.mixin({}, options && options.originalQuery || null,
							{ parent: parent.id }),
						options);
				},
				mayHaveChildren: function(){
					return true;
				},
				query: function(query, options){
					query = query || {};
					options = options || {};

					if(!query.parent && !options.deep){
						// Default to a single-level query for root items (no parent)
						query.parent = undefined;
					}
					return this.queryEngine(query, options)(this.data);
				}
			}),
			AsyncTreeStore = declare(TreeStore, {
				// TreeStore with an asynchronous query method.
				query: function(){
					this.dfd = new Deferred();
					this.queryResults = this.inherited(arguments);
					var promise = this.dfd.promise,
						results = new QueryResults(promise);
					results.total = this.queryResults.total;
					return results;
				},
				resolve: function(){
					// Allows the test to control when the store query is resolved.
					this.dfd.resolve(this.queryResults);
				},
				reject: function(){
					// Allows the test to control when the store query is rejected.
					this.dfd.reject(this.queryResults);
				}
			}),
			syncStore = new TreeStore({ data: createData() }),
			asyncStore = new AsyncTreeStore({ data: createData() });

		function createData(){
			return [
				{ id: 1, node: "Node 1", value: "Value 1"},
				{ id: 2, node: "Node 2", value: "Value 2", parent: 1},
				{ id: 3, node: "Node 3", value: "Value 3", parent: 2},
				{ id: 4, node: "Node 4", value: "Value 4", parent: 2},
				{ id: 5, node: "Node 5", value: "Value 5"}
			];
		}

		function createGrid(store){
			grid = new OnDemandGrid({
				store: store,
				columns: [
					tree({field: "node", label: "Node"}),
					{field: "value", label: "Value"}
				]
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		}

		function destroyGrid(){
			if(grid){
				grid.destroy();
				grid = null;
			}
		}

		function createOnPromise(target, event) {
			// Creates a promise based on an on.once call.
			// Resolves to the event passed to the handler function.
			var dfd = new Deferred(function () {
					handle.remove();
				}),
				handle = on.once(target, event, function (event) {
					dfd.resolve(event);
				});

			return dfd.promise;
		}

		function delayedResolve() {
			setTimeout(function(){ grid.store.resolve(); }, 10);
		}

		test.suite("tree with sync store", function(){
			test.beforeEach(function(){
				createGrid(syncStore);
			});
			test.afterEach(destroyGrid);

			// Tests
			test.test("expand + no callback", function(){
				assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
				grid.expand(1);
				assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
			});

			test.test("expand + callback", function(){
				var dfd = this.async(1000);
				assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
				grid.expand(1).then(dfd.callback(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
				}));
			});

			test.test("expand + multiple callback", function(){
				var dfd = this.async(1000);
				assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
				grid.expand(1).then(dfd.rejectOnError(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
					return grid.expand(2);
				})).then(dfd.rejectOnError(function(){
						assert.strictEqual(5, query(".dgrid-row", grid.domNode).length, "Grid has 5 rows");
						return grid.expand(4);
				})).then(dfd.callback(function(){
					assert.strictEqual(5, query(".dgrid-row", grid.domNode).length, "Grid has 5 rows");
				}));
			});

			test.test("duplicate expand + callback", function(){
				var dfd = this.async(1000);
				assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
				grid.expand(1).then(dfd.rejectOnError(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
					return grid.expand(1);
				})).then(dfd.callback(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows (no query)");
				}));
			});
		});

		test.suite("tree with async store", function(){
			test.beforeEach(function(){
				createGrid(asyncStore);
			});
			test.afterEach(destroyGrid);

			test.test("expand + callback", function(){
				var dfd = this.async(1000);
				
				createOnPromise(grid, "dgrid-refresh-complete").then(function(){
					// Start testing when the grid is ready.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length,
						"Grid has 2 rows");
					var promise = grid.expand(1);
					
					// Verify that the result is the same before the query resolves.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length,
						"Grid still has 2 rows before expand resolves");
					delayedResolve();
					return promise;
				}, function(err){
					dfd.reject(err);
				}).then(dfd.callback(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length,
						"Grid has 3 rows");
				}));

				assert.strictEqual(0, query(".dgrid-row", grid.domNode).length,
					"Grid has 0 rows before first async query resolves");
				// Resolve the grid's initial store query.
				delayedResolve();
			});

			test.test("expand + multiple callback", function(){
				var dfd = this.async(1000);
				
				function reject(err){ dfd.reject(err); }
				
				createOnPromise(grid, "dgrid-refresh-complete").then(function(){
					// Start testing when the grid is ready.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length,
						"Grid has 2 rows");
					var promise = grid.expand(1);

					// Verify that the result is the same before the query resolves.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length,
						"Grid still has 2 rows before expand resolves");
					delayedResolve();
					return promise;
				}, reject).then(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length,
						"Grid has 3 rows");
					var promise = grid.expand(2);

					// Verify that the result is the same before the query resolves.
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length,
						"Grid still has 3 rows before expand resolves");
					delayedResolve();
					return promise;
				}, reject).then(function(){
					assert.strictEqual(5, query(".dgrid-row", grid.domNode).length,
						"Grid has 5 rows");
					var promise = grid.expand(4);
					delayedResolve();
					return promise;
				}, reject).then(dfd.callback(function(){
					assert.strictEqual(5, query(".dgrid-row", grid.domNode).length,
						"Grid still has 5 rows after expanding item with no children");
				}));

				assert.strictEqual(0, query(".dgrid-row", grid.domNode).length,
					"Grid has 0 rows before first async query resolves");
				// Resolve the grid's initial store query.
				delayedResolve();
			});

			test.test("duplicate expand + callback", function(){
				var dfd = this.async(1000);
				
				function reject(err){ dfd.reject(err); }
				
				createOnPromise(grid, "dgrid-refresh-complete").then(function(){
					// Start testing when the grid is ready.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length,
						"Grid has 2 rows");
					var promise = grid.expand(1);
					delayedResolve();
					return promise;
				}, reject).then(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length,
						"Grid has 3 rows");
					return grid.expand(1);
				}, reject).then(dfd.callback(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length,
						"Grid still has 3 rows (no query)");
				}));
				
				assert.strictEqual(0, query(".dgrid-row", grid.domNode).length,
					"Grid has 0 rows before first async query resolves");
				// Resolve the grid's initial store query.
				delayedResolve();
			});
		});

		// TODO make the query throw an error.
	});
});