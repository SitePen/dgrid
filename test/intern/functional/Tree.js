define([
	'intern!tdd',
	'intern/chai!assert',
	'intern/dojo/node!leadfoot/helpers/pollUntil',
	'require'
], function (test, assert, pollUntil, require) {
	// dgrid.css defines a 300ms transition duration for .dgrid-tree-container
	// Add 20% for good measure
	var TRANSITION_DELAY = 360;

	function createExpandTest(clickTarget, clickMethod) {
		return function () {
			var xOffset = 0;
			// Nudge the y-offset of the cursor down a bit for good measure (default seems to be 0,0 in the target
			// element; in Firefox the click has been known to hit just above the target element)
			var remote = this.remote;

			if (remote.environmentType.browserName === 'safari') {
				console.warn('Warning: skipping a tree functional test because ' +
					'the safari web driver does not support mouseMoveTo.');
				return;
			}

			// With the cell selector used in the double-click test the cursor will be positioned at the start of the
			// cell, right over the expando
			// Move the cursor a bit to the right so it's not on the expando
			if (clickMethod === 'doubleClick') {
				xOffset = 30;
			}

			// Turn off whitespace check because it doesn't like [clickMethod]() on its own line
			/* jshint white: false */
			return remote.findByCssSelector('#treeGrid-row-AF ' + clickTarget)
				.moveMouseTo(xOffset, 8)
				[clickMethod]()
				.sleep(TRANSITION_DELAY)
				.end()
				.findByCssSelector('#treeGrid-row-SD')
				.isDisplayed()
				.then(function (isDisplayed) {
					assert.ok(isDisplayed, 'Expanded rows should be visible');
				})
				.end()
				.findByCssSelector('#treeGrid-row-AF ' + clickTarget)
				.moveMouseTo(xOffset, 8)
				[clickMethod]()
				.sleep(TRANSITION_DELAY)
				.end()
				.findByCssSelector('#treeGrid-row-SD')
				.isDisplayed()
				.then(function (isDisplayed) {
					assert.ok(!isDisplayed, 'Collapsed rows should not be visible');
				})
				.end();
		};
	}

	test.suite('dgrid/tree functional tests', function () {

		test.before(function () {
			var remote = this.remote;

			return remote.get(require.toUrl('./Tree.html'))
				.then(pollUntil(function () {
					return window.ready;
				}, null, 5000));
		});

		test.test('expand/collapse: click on expando node', createExpandTest('.dgrid-expando-icon', 'click'));
		test.test('expand/collapse: double-click on cell node', createExpandTest('.dgrid-column-0', 'doubleClick'));
	});

	test.suite('dgrid/Tree functional tests with CompoundColumns', function () {

		test.before(function () {
			var remote = this.remote;

			return remote.get(require.toUrl('./TreeCompound.html'))
				.then(pollUntil(function () {
					return window.ready;
				}, null, 5000));
		});

		test.test('expand/collapse: click on expando node', createExpandTest('.dgrid-expando-icon', 'click'));
		test.test('expand/collapse: double-click on cell node', createExpandTest('.dgrid-column-set-0', 'doubleClick'));
	});
});
