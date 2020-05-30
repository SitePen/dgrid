define([
	'dgrid/List',
	'dgrid/Grid',
	'dgrid/GridFromHtml',
	'dojo/parser',
	'dojo/dom-class',
	'dojo/dom-construct',
	'dojo/text!../resources/setClass.html'
], function (List, Grid, GridFromHtml, parser, domClass, domConstruct, gridTemplate) {
	var test = intern.getInterface('tdd');
	var assert = intern.getPlugin('chai').assert;

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
			function getColumns() {
				return {
					order: 'step', // give column a custom name
					name: {},
					description: { label: 'what to do', sortable: false }
				};
			}
			var gridC = window.gridC = new Grid({
					'class': 'c',
					columns: getColumns()
				}),
				gridCN = window.gridCN = new Grid({
					'class': 'cn',
					columns: getColumns()
				}),
				gridDOM = window.gridDOM = new Grid({
					columns: getColumns()
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
