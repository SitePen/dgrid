define([
	'intern!tdd',
	'intern/chai!assert',
	'dgrid/OnDemandGrid',
	'dgrid/Tree',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/query',
	'dstore/Memory',
	'../addCss!'
], function (test, assert, OnDemandGrid, Tree, declare, lang, query, Memory) {

	function formatName(name) {
		return name.charAt(0).toUpperCase() + name.slice(1);
	}

	test.suite('tree + additional filters', function () {
		var grid1;
		var grid2;
		var store;
		var noBlueStore;
		var TreeGrid = declare([OnDemandGrid, Tree]);
		var TreeStore = declare(Memory, {
			constructor: function () {
				this.root = this;
			},

			getChildren: function (parent) {
				if (parent.contains) {
					// Call filter from the original store to search all objects.
					return this.root.filter({ type: parent.contains });
				}
			},
			mayHaveChildren: function (obj) {
				return obj.type === 'basket';
			}
		});

		function destroyGrid(grid) {
			if (grid) {
				grid.destroy();
			}
		}

		test.before(function () {
			var id = 0;
			var iItemType, lItem;
			var iColor, lColor;
			var itemType, color;
			var items = [
				{ id: id++, name: 'Socks', type: 'basket', contains: 'sock' },
				{ id: id++, name: 'Shirts', type: 'basket', contains: 'shirt' },
				{ id: id++, name: 'Pants', type: 'basket', contains: 'pants' },
				{ id: id++, name: 'Hats', type: 'basket', contains: 'hat' }
			];
			var itemTypes = [ 'sock', 'shirt', 'pants', 'hat' ];
			var colors = [ 'red', 'green', 'blue', 'white' ];
			for (iItemType = 0, lItem = itemTypes.length; iItemType < lItem; iItemType++) {
				for (iColor = 0, lColor = colors.length; iColor < lColor; iColor++) {
					itemType = itemTypes[iItemType];
					color = colors[iColor];
					items.push({
						id: id++,
						name: formatName(color) + ' ' + formatName(itemType),
						type: itemType,
						color: color
					});
				}
			}

			store = new TreeStore({
				data: items
			});

			// Create a delegate of the original store with a new getChildren method.
			// Make getChildren remove the blue items.
			noBlueStore = lang.delegate(store, {
				getChildren: function (parent) {
					var children = this.root.getChildren(parent);
					return children.filter(function (obj) {
						return obj.color !== 'blue';
					});
				}
			});
		});

		test.beforeEach(function () {
			grid1 = new TreeGrid({
				collection: store.filter({ type: 'basket' }),
				columns: [
					{renderExpando: true, label: 'Name', field: 'name', sortable: false}
				],
				enableTreeTransitions: false
			});
			document.body.appendChild(grid1.domNode);
			grid1.startup();

			grid2 = new TreeGrid({
				collection: noBlueStore.filter({ type: 'basket' }),
				columns: [
					{renderExpando: true, label: 'Name', field: 'name', sortable: false}
				],
				enableTreeTransitions: false
			});
			document.body.appendChild(grid2.domNode);
			grid2.startup();
		});

		test.afterEach(function () {
			destroyGrid(grid1);
			destroyGrid(grid2);
		});

		//  Note:  since the following tests are using a Memory store which is synchronous, there is no
		//  need to wait for the expand's promise to resolve.
		test.test('expand tree with original store', function () {
			assert.strictEqual(4, query('.dgrid-row', grid1.domNode).length, 'Grid should have 4 rows');
			grid1.expand(1);
			assert.strictEqual(8, query('.dgrid-row', grid1.domNode).length, 'Grid should have 8 rows');
		});

		test.test('expand tree with no-blue store', function () {
			assert.strictEqual(4, query('.dgrid-row', grid2.domNode).length, 'Grid should have 4 rows');
			grid2.expand(3);
			assert.strictEqual(7, query('.dgrid-row', grid2.domNode).length, 'Grid should have 7 rows');
		});

		test.test('expand both trees', function () {
			assert.strictEqual(4, query('.dgrid-row', grid1.domNode).length, 'Grid should have 4 rows');
			assert.strictEqual(4, query('.dgrid-row', grid2.domNode).length, 'Grid should have 4 rows');

			grid1.expand(0);
			assert.strictEqual(8, query('.dgrid-row', grid1.domNode).length, 'Grid should have 8 rows');
			assert.strictEqual(4, query('.dgrid-row', grid2.domNode).length, 'Grid should have 4 rows');

			grid2.expand(3);
			assert.strictEqual(8, query('.dgrid-row', grid1.domNode).length, 'Grid should have 8 rows');
			assert.strictEqual(7, query('.dgrid-row', grid2.domNode).length, 'Grid should have 7 rows');

			grid1.expand(3);
			assert.strictEqual(12, query('.dgrid-row', grid1.domNode).length, 'Grid should have 12 rows');
			assert.strictEqual(7, query('.dgrid-row', grid2.domNode).length, 'Grid should have 7 rows');

			grid2.expand(0);
			assert.strictEqual(12, query('.dgrid-row', grid1.domNode).length, 'Grid should have 12 rows');
			assert.strictEqual(10, query('.dgrid-row', grid2.domNode).length, 'Grid should have 10 rows');
		});
	});
});
