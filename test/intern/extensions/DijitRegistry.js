define([
	'intern!tdd',
	'intern/chai!assert',
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
], function (test, assert, arrayUtil, declare, aspect, domConstruct,
		registry, BorderContainer, StackContainer, List, DijitRegistry) {

	var list,
		DijitList = declare([ List, DijitRegistry ]);

	test.suite('DijitRegistry', function () {
		test.afterEach(function () {
			list.destroy();
		});

		test.test('Dijit registry population', function () {
			var id = 'myId';
			list = new DijitList({ id: id });
			assert.strictEqual(registry.byId(id), list,
				'dgrid instances with DijitRegistry mixin should appear in dijit/registry');
		});

		test.suite('#placeAt', function () {
			test.beforeEach(function () {
				list = new DijitList();
			});

			test.suite('DOM', function () {
				var referenceNode;
				test.before(function () {
					referenceNode = domConstruct.create('div', null, document.body);
				});

				test.afterEach(function () {
					domConstruct.empty(referenceNode);
				});

				test.after(function () {
					domConstruct.destroy(referenceNode);
				});

				test.test('default placement (last child)', function () {
					domConstruct.create('div', null, referenceNode);
					list.placeAt(referenceNode);
					assert.strictEqual(referenceNode.lastChild, list.domNode,
						'placeAt with domNode should place dgrid instance as the last child by default');
				});

				test.test('specified placement', function () {
					list.placeAt(referenceNode, 'after');
					assert.strictEqual(referenceNode.nextSibling, list.domNode,
						'placeAt with domNode and placement argument should operate like domConstruct.place');
				});
			});

			test.suite('Dijit (also tests startup/destroy)', function () {
				var containerWidget;

				test.afterEach(function () {
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

				test.test('BorderContainer', createContainerTest(BorderContainer));
				test.test('StackContainer', createContainerTest(StackContainer));
			});
		});
	});
});
