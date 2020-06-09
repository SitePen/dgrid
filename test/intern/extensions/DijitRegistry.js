define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/dom-construct',
	'dijit/registry',
	'dijit/layout/BorderContainer',
	'dijit/layout/StackContainer',
	'dgrid/List',
	'dgrid/extensions/DijitRegistry',
	'dojo/domReady!'
], function (arrayUtil, declare, aspect, domConstruct, registry, BorderContainer,
	StackContainer, List, DijitRegistry) {

	var tdd = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;
	var DijitList = declare([ List, DijitRegistry ]);
	var list;

	tdd.suite('DijitRegistry', function () {
		tdd.afterEach(function () {
			list.destroy();
		});

		tdd.test('Dijit registry population', function () {
			var id = 'myId';
			list = new DijitList({ id: id });
			assert.strictEqual(registry.byId(id), list,
				'dgrid instances with DijitRegistry mixin should appear in dijit/registry');
		});

		tdd.suite('#placeAt', function () {
			tdd.beforeEach(function () {
				list = new DijitList();
			});

			tdd.suite('DOM', function () {
				var referenceNode;
				tdd.before(function () {
					referenceNode = domConstruct.create('div', null, document.body);
				});

				tdd.afterEach(function () {
					domConstruct.empty(referenceNode);
				});

				tdd.after(function () {
					domConstruct.destroy(referenceNode);
				});

				tdd.test('default placement (last child)', function () {
					domConstruct.create('div', null, referenceNode);
					list.placeAt(referenceNode);
					assert.strictEqual(referenceNode.lastChild, list.domNode,
						'placeAt with domNode should place dgrid instance as the last child by default');
				});

				tdd.test('specified placement', function () {
					list.placeAt(referenceNode, 'after');
					assert.strictEqual(referenceNode.nextSibling, list.domNode,
						'placeAt with domNode and placement argument should operate like domConstruct.place');
				});
			});

			tdd.suite('Dijit (also tests startup/destroy)', function () {
				var containerWidget;

				tdd.afterEach(function () {
					containerWidget.destroyRecursive();
				});

				function createContainerTest(Ctor) {
					return function () {
						containerWidget = new Ctor().placeAt(document.body);
						containerWidget.startup();

						var startupCalled = 0;
						var destroyCalled = 0;
						aspect.before(list, 'startup', function () {
							startupCalled++;
						});
						aspect.before(list, 'destroy', function () {
							destroyCalled++;
						});

						list.region = 'center'; // For BorderContainer (irrelevant for others)
						list.placeAt(containerWidget);

						assert.strictEqual(arrayUtil.indexOf(containerWidget.getChildren(), list), 0,
							'placeAt with layout widget should place dgrid instance inside layout widget');
						assert.strictEqual(startupCalled, 1,
							'dgrid instance should be started up when placed inside a started-up layout widget');

						containerWidget.destroyRecursive();
						assert.strictEqual(destroyCalled, 1,
							'list should be destroyed when destroyRecursive is called on its containing widget');
					};
				}

				tdd.test('BorderContainer', createContainerTest(BorderContainer));
				tdd.test('StackContainer', createContainerTest(StackContainer));
			});
		});
	});
});
