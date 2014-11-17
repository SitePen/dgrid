define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dgrid/List'
], function (test, assert, declare, List) {
	test.suite('createDestroy', function () {
		test.test('no params list', function () {
			var list = new List();
			document.body.appendChild(list.domNode);
			list.startup();
			list.renderArray([ 'foo', 'bar', 'baz' ]);

			assert.strictEqual(list.contentNode.children.length, 3,
				'List\'s contentNode has expected number of children after renderArray');

			list.destroy();
			assert.notStrictEqual(document.body, list.parentNode,
				'List is removed from body after destroy');
		});
	});
});
