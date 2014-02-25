define([
	"intern!tdd",
	"intern/chai!assert",
	"dgrid/List",
	"dgrid/Grid",
	"dgrid/editor",
	"dijit/registry",
	"dijit/form/TextBox",
	"dgrid/test/data/orderedData"
], function (test, assert, List, Grid, editor, registry, TextBox, orderedData) {
	
	test.suite("createDestroy", function(){
		// Tests
		test.test("no params list", function(){
			// build a list, start it up, and render
			var list = new List();
			document.body.appendChild(list.domNode);
			list.startup();
			list.renderArray([ "foo", "bar", "baz" ]);

			// check number of children
			assert.strictEqual(list.contentNode.children.length, 3,
				"List's contentNode has expected number of children after renderArray");

			// kill it & make sure we are all cleaned up
			list.destroy();
			assert.notStrictEqual(document.body, list.parentNode,
				"List is removed from body after destroy");
		});
	});
});
