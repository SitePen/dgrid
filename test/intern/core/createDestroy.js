define([
	"intern!tdd",
	"intern/chai!assert",
	"dojo/_base/declare",
	"dojo/on",
	"dojo/store/Memory",
	"dgrid/List",
	"dgrid/OnDemandGrid",
	"dgrid/TouchScroll",
	"dijit/registry",
	"dijit/form/TextBox",
	"dgrid/test/data/base"
], function (test, assert, declare, on, MemoryStore, List, OnDemandGrid, TouchScroll,
             registry, TextBox) {
	
	test.suite("createDestroy", function(){
		test.test("no params list", function(){
			var list = new List();
			document.body.appendChild(list.domNode);
			list.startup();
			list.renderArray([ "foo", "bar", "baz" ]);
			
			assert.strictEqual(list.contentNode.children.length, 3, 
				"List's contentNode has expected number of children after renderArray");
			
			list.destroy();
			assert.notStrictEqual(document.body, list.parentNode,
				"List is removed from body after destroy");
		});
		
		test.test("TouchScroll with useTouchScroll: false", function(){
			// Ensure TouchScroll is inherited for this test
			var list = new (declare([TouchScroll, List]))({ useTouchScroll: false });
			
			// This should not cause an error
			assert.doesNotThrow(function(){
				list.destroy();
			}, null, 'destroy should not throw error');
		});
		
		// this test is for issue #1030
		test.test("destroy grid with store before async refresh followup event should "
		        + "not throw global error", function(){
			var testResolution = this.async();
		
			var store = new MemoryStore([
				{id: 1, name: "foo"},
				{id: 2, name: "bar"},
				{id: 3, name: "baz"}
			]);
			var grid = new OnDemandGrid({
				store: store,
				columns: {
					name: "Name"
				}
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			
			assert.strictEqual(grid.contentNode.children.length, 3, 
				"Grid's contentNode has expected number of children after renderArray");
			
			grid.refresh();
			grid.destroy();
			// if dgrid is mixed in with dijit hierarchy, destroy() may unset domNode
			grid.domNode = null;
			assert.notStrictEqual(document.body, grid.parentNode,
				"Grid is removed from body after destroy");
			
			// Start watching for global error. There should be none.
		    var errorCatchingHandle = on(window, "error",
		    		testResolution.reject.bind(testResolution));
			
			// The error had been happening in a callback queued with setTimeout(0) in
			// refresh(). Here we queue another which will run after that one to close
			// out the test.
			setTimeout(testResolution.callback(function() {
				errorCatchingHandle.remove();
			}), 0);
		});
	});
});