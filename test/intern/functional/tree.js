define([
	"intern!tdd",
	"intern/chai!assert",
	"require"
], function(test, assert, require){
	// dgrid.css defines a 300ms transition duration for .dgrid-tree-container
	// Add 20% for good measure
	var TRANSITION_DELAY = 360;

	function createExpandTest(clickTarget, clickMethod){
		return function(){
			var xOffset = 0;
			// Nudge the y-offset of the cursor down a bit for good measure (default seems to be 0,0 in the target
			// element; in Firefox the click has been known to hit just above the target element)
			var yOffset = 8;
			var remote = this.get("remote");

			if(remote.environmentType.browserName === "safari"){
				console.warn("Warning: skipping a tree functional test because the safari web driver does not support mouseMoveTo.");
				return;
			}

			// With the cell selector used in the double-click test the cursor will be positioned at the start of the
			// cell, right over the expando
			// Move the cursor a bit to the right so it's not on the expando
			if(clickMethod === "doubleclick"){
				xOffset = 30;
			}

			remote.elementByCssSelector("#treeGrid-row-AF " + clickTarget)
				.moveTo(xOffset, 8)
				[clickMethod]()
				.sleep(TRANSITION_DELAY)
				.end()
				.elementByCssSelector("#treeGrid-row-SD")
				.isDisplayed()
				.then(function(isDisplayed){
					assert.ok(isDisplayed, "Expanded rows should be visible");
				})
				.end()
				.elementByCssSelector("#treeGrid-row-AF " + clickTarget)
				.moveTo(xOffset, 8)
				[clickMethod]()
				.sleep(TRANSITION_DELAY)
				.end()
				.elementByCssSelector("#treeGrid-row-SD")
				.isDisplayed()
				.then(function(isDisplayed){
					assert.ok(!isDisplayed, "Collapsed rows should not be visible");
				});

			return remote.end();
		};
	}

	test.suite("dgrid/tree functional tests", function(){

		test.before(function(){
			var remote = this.get("remote");

			return remote.get(require.toUrl("./tree.html")).waitForCondition("ready", 15000);
		});

		test.test("expand/collapse: click on expando node", createExpandTest(".dgrid-expando-icon", "click"));
		test.test("expand/collapse: double-click on cell node", createExpandTest(".dgrid-column-0", "doubleclick"));
	});
});
