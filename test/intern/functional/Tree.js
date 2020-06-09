/* jshint -W024 */
var pollUntil = require('@theintern/leadfoot/helpers/pollUntil').default;
/* jshint +W024 */
var tdd = intern.getPlugin('interface.tdd');
var assert = intern.getPlugin('chai').assert;

// dgrid.css defines a 300ms transition duration for .dgrid-tree-container
// Add 20% for good measure
var TRANSITION_DELAY = 360;

function createExpandTest(clickTarget, clickMethod) {
	return function (suite) {
		var xOffset = 0;
		// Nudge the y-offset of the cursor down a bit for good measure (default seems to be 0,0 in the target
		// element; in Firefox the click has been known to hit just above the target element)
		var remote = suite.remote;

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

tdd.suite('Tree functional tests', function () {

	tdd.before(function (suite) {
		var remote = suite.remote;

		return remote.get('dgrid/test/intern/functional/Tree.html')
			.then(pollUntil(function () {
				return window.ready;
			}, null, 5000));
	});

	tdd.test('expand/collapse: click on expando node', createExpandTest('.dgrid-expando-icon', 'click'));
	tdd.test('expand/collapse: double-click on cell node', createExpandTest('.dgrid-column-0', 'doubleClick'));
});

tdd.suite('Tree functional tests with CompoundColumns', function () {

	tdd.before(function (suite) {
		var remote = suite.remote;

		return remote.get('dgrid/test/intern/functional/TreeCompound.html')
			.then(pollUntil(function () {
				return window.ready;
			}, null, 5000));
	});

	tdd.test('expand/collapse: click on expando node', createExpandTest('.dgrid-expando-icon', 'click'));
	tdd.test('expand/collapse: double-click on cell node', createExpandTest('.dgrid-column-set-0', 'doubleClick'));
});

tdd.suite('Tree functional tests with CompoundColumns after column reset', function () {

	tdd.before(function (suite) {
		var remote = suite.remote;

		return remote.get('dgrid/test/intern/functional/TreeCompound.html')
			.then(pollUntil(function () {
				return window.ready;
			}, null, 5000))
			.then(function () {
				return remote.execute(function () {
					/* global treeGrid */
					treeGrid.set('columns', treeGrid.get('columns'));
				});
			});
	});

	tdd.test('expand/collapse: click on expando node', createExpandTest('.dgrid-expando-icon', 'click'));
	tdd.test('expand/collapse: double-click on cell node', createExpandTest('.dgrid-column-set-0', 'doubleClick'));
});
