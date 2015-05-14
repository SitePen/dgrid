define([
	'intern!tdd',
	'intern/chai!assert',
	'dgrid/List',
	'dgrid/Grid',
	'dgrid/GridFromHtml',
	'dojo/_base/array',
	'dojo/parser',
	'dojo/dom-class',
	'dojo/dom-construct',
	'dojo/text!../resources/setClass.html'
], function (test, assert, List, Grid, GridFromHtml, arrayUtil, parser, domClass, domConstruct, gridTemplate) {

	test.suite('setClass', function () {
		// Tests
		test.test('Lists + initially-defined classes', function () {
			function renderRow(item) {
				var div = document.createElement('div');
				div.appendChild(document.createTextNode(item.name));
				return div;
			}
			// Build three lists
			var listC = window.listC = new List({
					'class': 'c',
					renderRow: renderRow
				}),
				listCN = window.listCN = new List({
					className: 'cn',
					renderRow: renderRow
				}),
				listDOM = window.listDOM = new List({
					renderRow: renderRow
				}, domConstruct.create('div', {'class': 'dom'}));

			// Check the classes on each List.domNode
			assert.ok(domClass.contains(listC.domNode, 'c'));
			assert.ok(domClass.contains(listCN.domNode, 'cn'));
			assert.ok(domClass.contains(listDOM.domNode, 'dom'));

			// Destroy the lists after performing the tests
			listC.destroy();
			listCN.destroy();
			listDOM.destroy();
		});

		test.test('Grids + initially-defined classes', function () {
			// Build three grids
			var columns = {
					order: 'step', // give column a custom name
					name: {},
					description: { label: 'what to do', sortable: false }
				},
				gridC = window.gridC = new Grid({
					'class': 'c',
					columns: columns
				}),
				gridCN = window.gridCN = new Grid({
					'class': 'cn',
					columns: columns
				}),
				gridDOM = window.gridDOM = new Grid({
					columns: columns
				}, domConstruct.create('div', { 'class': 'dom' }));

			// Check the classes on each List.domNode
			assert.ok(domClass.contains(gridC.domNode, 'c'));
			assert.ok(domClass.contains(gridCN.domNode, 'cn'));
			assert.ok(domClass.contains(gridDOM.domNode, 'dom'));

			// Destroy the grids after performing the tests
			gridC.destroy();
			gridCN.destroy();
			gridDOM.destroy();
		});

		test.test('Declarative Grid + initially-defined class', function () {
			/* global gridDecl */

			// Create markup for a grid to be declaratively parsed
			var node = domConstruct.create('div', {
				innerHTML: gridTemplate
			});

			// Expose GridFromHtml via a global namespace for parser to use
			window.dgrid = { GridFromHtml: GridFromHtml };
			parser.parse(node);

			// Make sure the expected class exists on the parsed instance
			assert.ok(domClass.contains(gridDecl.domNode, 'dom'));

			// Destroy the grid after performing the test
			gridDecl.destroy();
		});
	});
});
