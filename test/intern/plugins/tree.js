define([
	"intern!tdd",
	"intern/chai!assert",
	"../../../OnDemandGrid",
	"dgrid/tree",
	"dgrid/util/has-css3",
	"dojo/_base/lang",
	"dojo/store/Memory",
	"put-selector/put"
], function(test, assert, OnDemandGrid, tree, has, lang, Memory, put){

	var grid, next;

	var testDelay = 25;

	function testRowExists(dataItemId){
		assert.isNotNull(document.getElementById(grid.id + "-row-" + dataItemId), "Could not find a row for " +
			dataItemId + " in the grid.");
	}

	function testRowDoesNotExist(dataItemId){
		assert.isNull(document.getElementById(grid.id + "-row-" + dataItemId), "Found a row for " +
			dataItemId + " in the grid.");
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
			});

			test.afterEach(function(){
				grid.destroy();
				grid = null;
			});

			test.test("expand first row", function(){
				var dfd = this.async();
				// Scroll to the bottom of the grid once the row expansion transition is finished.
				grid.on(has("transitionend"), dfd.callback(function(){
					testRowExists("0:0");
					testRowDoesNotExist("0:99");
				}));
				grid.expand(0);
			});

			test.test("expand first row + scroll to bottom", function(){
				var dfd = this.async();
				// Scroll to the bottom of the grid once the row expansion transition is finished.
				grid.on(has("transitionend"), dfd.rejectOnError(function(){
					var scrollNode = grid.bodyNode;
					scrollNode.scrollTop = scrollNode.scrollHeight;
					setTimeout(dfd.callback(function(){
						testRowExists("0:0");
						testRowExists("0:99");
					}), testDelay);
				}));
				grid.expand(0);
			});

			test.test("expand last row", function(){
				var dfd = this.async();
				// Scroll to the bottom of the grid once the row expansion transition is finished.
				grid.on(has("transitionend"), dfd.callback(function(){
					testRowExists("4:0");
					testRowDoesNotExist("4:99");
				}));
				grid.expand(4);
			});

			test.test("expand last row + scroll to bottom", function(){
				var dfd = this.async();
				// Scroll to the bottom of the grid once the row expansion transition is finished.
				grid.on(has("transitionend"), dfd.rejectOnError(function(){
					var scrollNode = grid.bodyNode;
					scrollNode.scrollTop = scrollNode.scrollHeight;
					setTimeout(dfd.callback(function(){
						testRowExists("4:0");
						testRowExists("4:99");
					}), testDelay);
				}));
				grid.expand(4);
			});

			test.test("expand first and last rows + scroll to bottom", function(){
				var dfd = this.async();
				// Scroll to the bottom of the grid once the row expansion transition is finished.
				grid.on(has("transitionend"), dfd.rejectOnError(function(){
					var scrollNode = grid.bodyNode;
					scrollNode.scrollTop = scrollNode.scrollHeight;
					// Execute the next step if there is one.  Add a delay to allow the grid to update.
					next && setTimeout(next, testDelay);
				}));

				var next = dfd.rejectOnError(function(){
					// After the first row is expanded, expand the last row.
					next = dfd.callback(function(){
						// Did all of the rows load?
						testRowExists("4:0");
						testRowExists("4:99");
					});
					grid.expand(4);
				});
				grid.expand(0);
			});
		});
	});
});