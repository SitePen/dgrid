define([
	"intern!tdd",
	"intern/assert",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/query",
	"dgrid/Grid",
	"dgrid/util/misc"
], function (test, assert, lang, array, domStyle, domConstruct, query, Grid, miscUtil) {
	var testDiv;

	test.suite("addCssRule", function(){
		// Setup / teardown
		test.before(function(){
			testDiv = domConstruct.create("div", null, document.body);
		});

		test.after(function(){
			domConstruct.destroy(testDiv);
		});

		// Tests
		test.test("addCssRule + remove", function(){
			testDiv.className = "foo";
			// cache original style and update .foo
			var origStyle = domStyle.getComputedStyle(testDiv).fontSize,
				rule = miscUtil.addCssRule(".foo", "font-size: 8px;");
			// check updated font size was applied
			assert.strictEqual("8px", domStyle.getComputedStyle(testDiv).fontSize,
				"Node with matching class has expected font-size");
			// remove the rule & make sure the computed style is good again
			rule.remove();
			assert.strictEqual(origStyle, domStyle.getComputedStyle(testDiv).fontSize,
				"Node with matching class no longer has font-size from removed rule");
			testDiv.className = "";
		});

		test.test("addCssRule get/set/remove", function(){
			testDiv.className = "bar";
			// cache original style and update .foo
			var origStyle = domStyle.getComputedStyle(testDiv).fontSize,
				rule = miscUtil.addCssRule(".bar", "font-size: 8px;");
			// check updated font size was applied
			assert.strictEqual("8px", rule.get("fontSize"),
				"rule.get('fontSize') reports expected value");
			// update the font size
			rule.set("fontSize", "9px");
			// verify that the size updated
			assert.strictEqual("9px", domStyle.getComputedStyle(testDiv).fontSize,
				"Node with matching class has expected font-size after set");
			// make sure rule.get works the same
			assert.strictEqual("9px", rule.get("fontSize"),
				"rule.get('fontSize') reports expected value after set");
			// remove the rule & make sure it updates
			rule.remove();
			assert.strictEqual(origStyle, domStyle.getComputedStyle(testDiv).fontSize,
				"Node with matching class no longer has font-size from removed rule");
			testDiv.className = "";
		});

		test.test("add/remove multiple rules in mixed order", function(){
			var origStyle = domStyle.getComputedStyle(testDiv).fontSize,
				rules = [],
				expected = { // hash containing test classes / values
					foo: "7px",
					bar: "8px",
					baz: "9px"
				},
				cls;
			
			function check(){
				// Test that all expected styles hold
				var cls;
				for(cls in expected){
					testDiv.className = cls;
					assert.strictEqual(expected[cls], domStyle.getComputedStyle(testDiv).fontSize,
						"Node with class " + cls + " has expected font-size");
				}
				testDiv.className = "";
			}
			
			// Create rules and maintain references to returned objects
			for(cls in expected){
				rules.push(miscUtil.addCssRule("." + cls, "font-size: " + expected[cls] + ";"));
			}
			
			// Do initial check, then remove rules one by one, out of order,
			// updating the hash and checking each time along the way
			check();
			
			rules[2].remove();
			expected.baz = origStyle;
			check();
			
			rules[0].remove();
			expected.foo = origStyle;
			check();
			
			rules[1].remove();
			expected.bar = origStyle;
			check();
		});

		test.test("addCssRule via dgrid APIs", function(){
			var values = ["7px", "8px"],
				columns = {
					name: "Name",
					value: "Value",
					comment: "Comment" // unstyled buffer
				},
				origValues,
				grid,
				rules,
				i;
			
			function createGrid(config){
				grid = new Grid(lang.mixin({
					id: "my.grid", // test escaping of CSS identifiers from methods
					columns: columns
				}, config || {}));
				document.body.appendChild(grid.domNode);
				grid.startup();
			}
			
			function addRules(){
				var rules = [];
				
				rules.push(grid.addCssRule(".field-value", "font-size: " + values[0] + ";"));
				rules.push(grid.styleColumn("name", "font-size: " + values[1] + ";"));
				
				return rules;
			}
			
			function getStyles(){
				return [
					domStyle.getComputedStyle(query(".field-value", grid.domNode)[0]).fontSize,
					domStyle.getComputedStyle(query(".dgrid-column-name", grid.domNode)[0]).fontSize
				];
			}
			
			function checkRules(expected, extra){
				var actual = getStyles(grid);
				assert.strictEqual(expected[0], actual[0],
					(extra || "") + " Style modified via addCssRule has expected value. Expected: " + expected[0] + ", Actual: " + actual[0]);
				assert.strictEqual(expected[1], actual[1],
					(extra || "") + " Style modified via styleColumn has expected value. Expected: " + expected[1] + ", Actual: " + actual[1]);
			}

			function removeRules(rules){
				array.forEach(rules,function(rule){
					rule.remove();
				});
			}
			
			// Test if rules are applied
			createGrid({cleanAddedRules: true, cleanAddedColumnRules: true});
			// Collect original style values for later cleanup check
			origValues = getStyles();
			// Add rules and make sure they applied as expected
			addRules();
			checkRules(values, "1:");
			// Destroy the grid, which should remove the style rules
			grid.destroy();
			
			// Create a grid and tell it not to clean rules added via addCssRule.
			createGrid({cleanAddedRules: false, cleanAddedColumnRules: true});
			// Before adding styles, make sure the ones from last time were removed
			checkRules(origValues, "2:");
			// Add rules and check again;
			// store the rules for tearDown since they won't be cleaned up
			rules = addRules();
			checkRules(values, "3:");
			// Destroy the grid, which should *not* remove the addCssRule style rules
			// but should remove the styleColumn rules
			grid.destroy();
			
			// Create a grid to see if the styles are still there.
			createGrid({cleanAddedRules: true, cleanAddedColumnRules: true});
			// Check that one style from last time still exists
			checkRules([values[0], origValues[1]], "4:");
			// Destroy the grid (which won't remove the styles from last time,
			// since no handles were added to this exact instance)
			grid.destroy();
			// Clean up rule litter from cleanAddedRules: false test
			removeRules(rules);

			// Create a grid and tell it not to clean up styles created from styleColumn
			createGrid({cleanAddedRules: true, cleanAddedColumnRules: false});
			// Before adding styles, make sure the ones from last time were removed
			checkRules(origValues, "5:");
			// Add rules and check again;
			// store the rules for tearDown since they won't be cleaned up
			rules = addRules();
			checkRules(values, "6:");
			// Destroy the grid, which should *not* remove the styleColumn rules
			grid.destroy();

			// Create a grid to see if the styleColumn styles are still there.
			createGrid({cleanAddedRules: true, cleanAddedColumnRules: true});
			// Check that one style from last time still exists
			checkRules([origValues[0], values[1]], "7:");
			// Destroy the grid (which won't remove the styles from last time,
			// since no handles were added to this exact instance)
			grid.destroy();
			// Clean up rule litter from cleanAddedColumnRules: false test
			removeRules(rules);

			// Create a grid to see if setting the columns clears the styleColumn rules
			createGrid();
			// Before adding styles, make sure the ones from last time were removed
			checkRules(origValues, "8:");
			// Add rules and make sure they applied as expected
			rules = addRules();
			assert.strictEqual(1, grid._columnRules.length);
			checkRules(values, "9:");
			// Set the columns to the same definition.
			grid.set("columns", columns);
			// The column set rules should have reset.
			checkRules([values[0], origValues[1]], "10:");
			// Add rules and make sure they applied as expected
			addRules();
			assert.strictEqual(1, grid._columnRules.length);
			checkRules(values, "11:");
			// Destroy the grid, which should remove the style rules
			grid.destroy();
			createGrid();
			checkRules(origValues, "12:");
			grid.destroy();

			// Create a grid to see if setting the columns does not clear the styleColumn rules
			// when cleanAddedColumnRules is false;
			createGrid({cleanAddedColumnRules: false});
			// Before adding styles, make sure the ones from last time were removed
			checkRules(origValues, "13:");
			// Add rules and check again;
			// store the rules for tearDown since they won't be cleaned up
			rules = addRules();
			checkRules(values, "14:");
			// Set the columns to the same definition.
			grid.set("columns", columns);
			// The rules should be the same
			checkRules(values, "15:");
			// Destroy the grid, which should *not* remove the styleColumn rules
			grid.destroy();
			removeRules(rules);
		});
	});
});