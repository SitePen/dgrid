define([
	"intern!tdd",
	"intern/assert",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/query",
	"dgrid/Grid",
	"dgrid/ColumnSet"
], function (test, assert, declare, lang, array, domStyle, domConstruct, query, Grid, ColumnSet) {
	var testDiv;

	function arraysMatch(array1, array2){
		if(!array1 || !array2 || (array1.length !== array2.length)){
			return false;
		}
		return !array.some(array1, function(item, i){
			return item !== array2[i];
		});
	}

	test.suite("ColumnSet", function(){
		test.before(function(){
			testDiv = domConstruct.create("div", null, document.body);
			domStyle.set(testDiv, "font-size", "19px");
		});

		test.after(function(){
			domConstruct.destroy(testDiv);
		});

		test.test("styleColumnSet", function(){
			var defaultFontSizes = ["19px", "19px", "19px", "19px", "19px", "19px"],
				modifiedFontSizes,
				grid,
				rules = [],
				CustomGrid = declare([Grid, ColumnSet]);

			function createGrid(config){
				grid = new CustomGrid(lang.mixin({
					id: "my.grid", // test escaping of CSS identifiers from methods
					columnSets: [
						[
							[
								{label: "Column 1", field: "col1"},
								{label: "Column 2", field: "col2"}
							],
							[
								{label: "Column 3", field: "col3", colSpan: 2}
							]
						],
						[
							[
								{label: "Column 4", field: "col4", rowSpan: 2},
								{label: "Column 5", field: "col5"}
							],
							[
								{label: "Column 6", field: "col6"}
							]
						]]
				}, config || {}));
				domConstruct.place(grid.domNode, testDiv);
				grid.startup();
			}

			function getFontSizes(){
				var styles = [];
				for (var i = 1; i <= 6; i++){
					styles.push(domStyle.getComputedStyle(query(".field-col" + i, grid.domNode)[0]).fontSize);
				}
				return styles;
			}

			function removeRules(){
				array.forEach(rules, function(rule){
					rule.remove();
				});
				rules = [];
			}

			modifiedFontSizes = ["8px", "8px", "8px", "19px", "19px", "19px"];
			// Create a grid to see if styleColumnSet works.
			createGrid();
			// Test the initial font sizes.
			assert.isTrue(arraysMatch(defaultFontSizes, getFontSizes()), "Expect default values.");
			// Call styleColumnSet
			grid.styleColumnSet("0", "font-size: 8px;");
			// Did it work?
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Destroy the grid, the CSS rules created above should be deleted.
			grid.destroy();

			// Create a grid with cleanAddedColumnRules set to false.
			createGrid({cleanAddedColumnRules: false});
			// Test the initial font sizes.
			assert.isTrue(arraysMatch(defaultFontSizes, getFontSizes()), "Expect default values.");
			// Call styleColumnSet
			rules.push(grid.styleColumnSet("0", "font-size: 8px;"));
			// Did it work?
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Destroy the grid, the CSS rules should remain
			grid.destroy();
			// Create a grid
			createGrid();
			// The styles should not be the default.
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Clean up
			grid.destroy();
			removeRules();

			// Do it all again but with the second column set.

			modifiedFontSizes = ["19px", "19px", "19px", "8px", "8px", "8px"];
			// Create a grid to see if styleColumnSet works.
			createGrid();
			// Test the initial font sizes.
			assert.isTrue(arraysMatch(defaultFontSizes, getFontSizes()), "Expect default values.");
			// Call styleColumnSet
			grid.styleColumnSet("1", "font-size: 8px;");
			// Did it work?
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Destroy the grid, the CSS rules created above should be deleted.
			grid.destroy();

			// Create a grid with cleanAddedColumnRules set to false.
			createGrid({cleanAddedColumnRules: false});
			// Test the initial font sizes.
			assert.isTrue(arraysMatch(defaultFontSizes, getFontSizes()), "Expect default values.");
			// Call styleColumnSet
			rules.push(grid.styleColumnSet("1", "font-size: 8px;"));
			// Did it work?
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Destroy the grid, the CSS rules should remain
			grid.destroy();
			// Create a grid
			createGrid();
			// The styles should not be the default.
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Clean up
			grid.destroy();
			removeRules();

			// Do it all again but with the both column sets.
			modifiedFontSizes = ["9px", "9px", "9px", "8px", "8px", "8px"];
			// Create a grid to see if styleColumnSet works.
			createGrid();
			// Test the initial font sizes.
			assert.isTrue(arraysMatch(defaultFontSizes, getFontSizes()), "Expect default values.");
			// Call styleColumnSet
			grid.styleColumnSet("0", "font-size: 9px;");
			grid.styleColumnSet("1", "font-size: 8px;");
			// Did it work?
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Destroy the grid, the CSS rules created above should be deleted.
			grid.destroy();

			// Create a grid with cleanAddedColumnRules set to false.
			createGrid({cleanAddedColumnRules: false});
			// Test the initial font sizes.
			assert.isTrue(arraysMatch(defaultFontSizes, getFontSizes()), "Expect default values.");
			// Call styleColumnSet
			rules.push(grid.styleColumnSet("0", "font-size: 9px;"));
			rules.push(grid.styleColumnSet("1", "font-size: 8px;"));
			// Did it work?
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Destroy the grid, the CSS rules should remain
			grid.destroy();
			// Create a grid
			createGrid();
			// The styles should not be the default.
			assert.isTrue(arraysMatch(modifiedFontSizes, getFontSizes()), "Expect all fields in the first column set to have a font size of 8px.");
			// Clean up
			grid.destroy();
			removeRules();
		});
	});
});