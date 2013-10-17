define([
	"intern!tdd",
	"intern/chai!assert",
	"dgrid/OnDemandGrid",
	"dgrid/tree",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/store/Memory",
	"dojo/store/util/QueryResults",
	"dojo/dom-construct",
	"dojo/query",
	"dojo/Deferred"
], function(test, assert, OnDemandGrid, tree, declare, lang, Memory, QueryResults, domConstruct, query, Deferred){

	test.suite("tree (expand + promise)", function(){
		var grid;
		var SyncTreeStore = declare(Memory, {
			// A memory store with methods to support a tree
			getChildren: function(parent, options){
				// Support persisting the original query via options.originalQuery
				// so that child levels will filter the same way as the root level
				return this.query(
					lang.mixin({}, options && options.originalQuery || null,
						{ parent: parent.id }),
					options);
			},
			mayHaveChildren: function(parent){
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
		});
		var AsyncTreeStore = declare(SyncTreeStore, {
			// SyncTreeStore with an asynchronous query method.
			query: function(query, options){
				this.dfd = new Deferred();
				var promise = this.dfd.promise;
				this.queryResults = this.inherited(arguments);
				return QueryResults(promise);
			},
			resolve: function(){
				// Allows the test to control when the store query is resolved.
				this.dfd.resolve(this.queryResults);
			}
		});

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
			domConstruct.place(grid.domNode, document.body);
			grid.startup();
		}

		function destroyGrid(){
			if(grid){
				grid.destroy();
				grid = null;
			}
		}

		test.suite("tree with sync store", function(){
			test.beforeEach(function(){
				var data = createData();
				var store = new SyncTreeStore({
					data: data
				});
				createGrid(store);
			});
			test.afterEach(function(){
				destroyGrid();
			});

			// Tests
			test.test("expand + no callback", function(){
				assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
				grid.expand(1);
				// The memory store is asynchronous
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
				grid.expand(1).then(dfd.callback(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
					grid.expand(2).then(dfd.callback(function(){
						assert.strictEqual(5, query(".dgrid-row", grid.domNode).length, "Grid has 5 rows");
						grid.expand(4).then(dfd.callback(function(){
							assert.strictEqual(5, query(".dgrid-row", grid.domNode).length, "Grid has 5 rows");
						}));
					}));
				}));
			});

			test.test("duplicate expand + callback", function(){
				var dfd = this.async(1000);
				assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
				grid.expand(1).then(dfd.callback(function(){
					assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
					grid.expand(1).then(dfd.callback(function(){
						assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
					}));
				}));
			});
		});

		test.suite("tree with async store", function(){
			test.beforeEach(function(){
				var data = createData();
				var store = new AsyncTreeStore({
					data: data
				});
				createGrid(store);
			});
			test.afterEach(function(){
				destroyGrid();
			});

			test.test("expand + callback", function(){
				var dfd = this.async(1000);
				grid.on("dgrid-refresh-complete", dfd.callback(function(){
					// Start testing when the grid is ready.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
					grid.expand(1).then(dfd.callback(function(){
						assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
					}));
					// The expand has not occurred yet.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
					grid.store.resolve();
				}));
				assert.strictEqual(0, query(".dgrid-row", grid.domNode).length, "Grid has 0 rows");
				// Resolve the grid's initial store query.
				grid.store.resolve();
			});

			test.test("expand + multiple callback", function(){
				var dfd = this.async(1000);
				grid.on("dgrid-refresh-complete", dfd.callback(function(){
					// Start testing when the grid is ready.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
					grid.expand(1).then(dfd.callback(function(){
						assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
						grid.expand(2).then(dfd.callback(function(){
							assert.strictEqual(5, query(".dgrid-row", grid.domNode).length, "Grid has 5 rows");
							grid.expand(4).then(dfd.callback(function(){
								assert.strictEqual(5, query(".dgrid-row", grid.domNode).length, "Grid has 5 rows");
							}));
							// Resolve expand(4) query
							grid.store.resolve();
						}));
						// The expand has not occurred yet.
						assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
						// Resolve expand(2) query
						grid.store.resolve();
					}));
					// The expand has not occurred yet.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
					// Resolve expand(1) query
					grid.store.resolve();
				}));
				// Resolve the grid's initial store query.
				grid.store.resolve();
			});

			test.test("duplicate expand + callback", function(){
				var dfd = this.async(1000);
				grid.on("dgrid-refresh-complete", dfd.callback(function(){
					// Start testing when the grid is ready.
					assert.strictEqual(2, query(".dgrid-row", grid.domNode).length, "Grid has 2 rows");
					grid.expand(1).then(dfd.callback(function(){
						assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
						grid.expand(1).then(dfd.callback(function(){
							assert.strictEqual(3, query(".dgrid-row", grid.domNode).length, "Grid has 3 rows");
						}));
					}));
					grid.store.resolve();
				}));
				// Resolve the grid's initial store query.
				grid.store.resolve();
			});
		});

		// TODO make the query throw an error.
	});
});