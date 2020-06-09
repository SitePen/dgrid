define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/json',
	'dojo/dom-class',
	'dstore/Memory',
	'dstore/Trackable',
	'dgrid/Grid',
	'dgrid/OnDemandGrid',
	'dgrid/Selection',
	'dgrid/CellSelection',
	'dgrid/extensions/Pagination'
], function (declare, arrayUtil, JSON, domClass, Memory, Trackable, Grid, OnDemandGrid,
	Selection, CellSelection, Pagination) {

	var tdd = intern.getPlugin('interface.tdd');
	var assert = intern.getPlugin('chai').assert;
	var TrackableMemory = declare([ Memory, Trackable ]);
	var mixins = {
		Selection: Selection,
		CellSelection: CellSelection
	};
	var notificationTests = {};
	var grid;

	function _createTestData(size) {
		var data = [],
			aCode = 'A'.charCodeAt(0),
			i;
		size = size || 15;
		for (i = 0; i < size; i++) {
			data.push({
				id: i,
				first: 'First' + String.fromCharCode(aCode + (i % 26)),
				last: 'Last' + String.fromCharCode(aCode + 25 - (i % 26))
			});
		}
		return data;
	}

	function countProperties(object) {
		var count = 0,
			key;

		for (key in object) {
			if (object.hasOwnProperty(key)) {
				count++;
			}
		}
		return count;
	}

	function getColumns() {
		return {
			first: 'First Name',
			last: 'Last Name'
		};
	}

	arrayUtil.forEach([ 'Selection', 'CellSelection' ], function (name) {
		var SelectionMixin = mixins[name];
		notificationTests[name + ' + update'] = function () {
			var store = new TrackableMemory({
					data: _createTestData()
				});

			grid = new (declare([OnDemandGrid, SelectionMixin]))({
				columns: getColumns(),
				collection: store,
				sort: 'id'
			});

			document.body.appendChild(grid.domNode);
			grid.startup();

			// Using this long-winded approach for the purposes
			// of the same logic working for both Selection and
			// CellSelection
			grid.select(grid.row(3));
			grid.select(grid.row(4));
			grid.select(grid.row(5));
			grid.select(grid.row(6));
			grid.select(grid.row(7));

			var selection = grid.selection;
			assert.strictEqual(countProperties(selection), 5,
				'Selection contains the expected number of items');
			assert.ok(selection[3] && selection[4] && selection[5] &&
				selection[6] && selection[7],
				'Selection contains the expected items');

			store.put({ id: 5, first: 'Updated First', last: 'Updated Last'});
			store.put({ id: 99, first: 'New First', last: 'New Last'});

			assert.ok(selection[3] && selection[4] && selection[5] &&
				selection[6] && selection[7],
				'Selection still contains the same items');

			assert.ok(!selection[99],
				'Selection does not contain newly-added item');

			store.remove(5);
			assert.ok(selection[3] && selection[4] && !selection[5] &&
				selection[6] && selection[7],
				'Item 5 has been removed from the selection');

			// Calling remove row does not notify the store so the selection is not updated.
			grid.row(4).remove();
			assert.ok(selection[3] && selection[4] && !selection[5] &&
				selection[6] && selection[7],
				'Selection is unchanged when calling removeRow directly on a store-backed grid');

			grid.destroy();
		};

		notificationTests[name + ' + update + no store'] = function () {
			grid = new (declare([Grid, SelectionMixin]))({
				columns: getColumns()
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(_createTestData());

			// Using this long-winded approach for the purposes
			// of the same logic working for both Selection and
			// CellSelection
			grid.select(grid.row(3));
			grid.select(grid.row(4));
			grid.select(grid.row(5));
			grid.select(grid.row(6));
			grid.select(grid.row(7));

			var selection = grid.selection;
			assert.strictEqual(countProperties(selection), 5,
				'Selection contains the expected number of items');
			assert.ok(selection[3] && selection[4] && selection[5] &&
				selection[6] && selection[7],
				'Selection contains the expected items');

			grid.row(4).remove();
			assert.strictEqual(countProperties(selection), 4,
				'Selection contains 1 fewer items after removal of selected item');
			assert.ok(selection[3] && !selection[4] && selection[5] &&
				selection[6] && selection[7],
				'Item 4 has been removed from the selection');

			grid.row(1).remove();
			assert.strictEqual(countProperties(selection), 4,
				'Selection is unchanged after removal of unselected item');
			assert.ok(selection[3] && !selection[4] && selection[5] &&
				selection[6] && selection[7],
				'Selection is unchanged after removal of unselected item');

			grid.row(3).remove();
			assert.strictEqual(countProperties(selection), 3,
				'Selection contains 1 fewer items after removal of selected item');
			assert.ok(!selection[3] && !selection[4] && selection[5] &&
				selection[6] && selection[7],
				'Item 3 has been removed from the selection');

			grid.row(5).remove();
			grid.row(6).remove();
			grid.row(7).remove();
			assert.strictEqual(countProperties(selection), 0,
				'No items are selected after all selected items have been removed');

			grid.destroy();
		};

		notificationTests[name + ' + update + store + paging'] = function () {
			// Create a selection, trigger paging, notify
			var store = new TrackableMemory({
					data: _createTestData(100)
				});

			grid = new (declare([Grid, SelectionMixin, Pagination]))({
				collection: store,
				columns: getColumns()
			});

			document.body.appendChild(grid.domNode);
			grid.startup();

			function checkStyles() {
				// Checks to see if the rendered rows that are selected have the dgrid-selected style
				// and no unselected rows have that style
				var selection = grid.selection,
					id,
					rowElement,
					rowObject,
					isHighlighted,
					shouldBeHighlighted;

				for (id in grid._rowIdToObject) {
					rowElement = document.getElementById(id);
					rowObject = grid._rowIdToObject[id];
					if (rowElement) {
						if (name === 'Selection') {
							isHighlighted = domClass.contains(rowElement, 'dgrid-selected');
						}
						else {
							isHighlighted = domClass.contains(grid.cell(rowObject.id, 'first').element,
								'dgrid-selected');
						}
						shouldBeHighlighted = !!selection[rowObject.id];
						assert.strictEqual(isHighlighted, shouldBeHighlighted,
							'Expected ' + JSON.stringify(rowObject) + ' to' +
							(shouldBeHighlighted ? '' : ' not') + ' be selected.');
					}
				}
			}

			function checkSelected(ids) {
				var selection = grid.selection;
				var numIds = ids.length;
				checkStyles();
				assert.strictEqual(countProperties(selection), numIds,
					'Selection contains the expected number of items: ' + numIds);
				assert.ok(arrayUtil.every(ids, function (id) {
					return id in selection;
				}), 'Selection contains the expected items');
			}

			var initSelection = [3, 4, 5, 23, 24, 25];
			arrayUtil.forEach(initSelection, function (id) {
				grid.select(grid.row(id));
			});
			checkSelected(initSelection);

			grid.gotoPage(4);
			checkSelected(initSelection);

			grid.gotoPage(1);
			store.put({ id: 1, first: 'Updated First 1', last: 'Updated Last 1'});
			checkSelected(initSelection);
			assert.isTrue(grid.cell(1, 'first').element.innerHTML.indexOf('Updated First 1') > -1);
			store.put({ id: 4, first: 'Updated First 4', last: 'Updated Last 4'});
			checkSelected(initSelection);
			assert.isTrue(grid.cell(4, 'first').element.innerHTML.indexOf('Updated First 4') > -1);

			store.put({ id: 24, first: 'Updated First', last: 'Updated Last'});
			checkSelected(initSelection);

			store.put({ id: 1999, first: 'New First', last: 'New Last'});
			checkSelected(initSelection);

			store.remove(2);
			checkSelected(initSelection);

			store.remove(3);
			checkSelected([4, 5, 23, 24, 25]);

			store.remove(25);
			checkSelected([4, 5, 23, 24]);

			grid.destroy();
		};

		notificationTests[name + ' events + store'] = function () {
			// Create and remove selections, watch for events
			var store = new TrackableMemory({
					data: _createTestData()
				});

			grid = new (declare([OnDemandGrid, SelectionMixin]))({
				columns: getColumns(),
				collection: store,
				sort: 'id'
			});

			document.body.appendChild(grid.domNode);
			grid.startup();

			var selectEventFired;
			var deselectEventFired;
			grid.on('dgrid-select', function () {
				selectEventFired++;
			});
			grid.on('dgrid-deselect', function () {
				deselectEventFired++;
			});

			function testEvents() {
				selectEventFired = 0;
				deselectEventFired = 0;

				grid.select(3);
				assert.strictEqual(selectEventFired, 1, 'Select event fired once: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 0, 'Deselect event not fired: ' + deselectEventFired);

				grid.deselect(3);
				assert.strictEqual(selectEventFired, 1, 'Select event fired once: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

				grid.select(3);
				assert.strictEqual(selectEventFired, 2, 'Select event fired twice: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

				grid.select(4);
				assert.strictEqual(selectEventFired, 3, 'Select event fired three times: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

				grid.deselect(3);
				assert.strictEqual(selectEventFired, 3, 'Select event fired three times: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 2, 'Deselect event fired twice: ' + deselectEventFired);

				grid.deselect(4);
				assert.strictEqual(selectEventFired, 3, 'Select event fired three times: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 3, 'Deselect event fired three times: ' + deselectEventFired);
			}

			// Run the event tests
			testEvents();
			// Change the store
			store = new TrackableMemory({
				data: _createTestData()
			});
			grid.set('collection', store);
			// Run the tests again
			testEvents();

			grid.destroy();
		};

		notificationTests[name + ' events + no store'] = function () {
			// Create and remove selections, watch for events
			var selectEventFired = 0,
				deselectEventFired = 0;

			grid = new (declare([Grid, SelectionMixin]))({
				columns: getColumns()
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(_createTestData());

			grid.on('dgrid-select', function () {
				selectEventFired++;
			});
			grid.on('dgrid-deselect', function () {
				deselectEventFired++;
			});

			grid.select(3);
			assert.strictEqual(selectEventFired, 1, 'Select event fired once: ' + selectEventFired);
			assert.strictEqual(deselectEventFired, 0, 'Deselect event not fired: ' + deselectEventFired);

			grid.deselect(3);
			assert.strictEqual(selectEventFired, 1, 'Select event fired once: ' + selectEventFired);
			assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

			grid.select(3);
			assert.strictEqual(selectEventFired, 2, 'Select event fired twice: ' + selectEventFired);
			assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

			grid.select(4);
			assert.strictEqual(selectEventFired, 3, 'Select event fired three times: ' + selectEventFired);
			assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

			grid.deselect(3);
			assert.strictEqual(selectEventFired, 3, 'Select event fired three times: ' + selectEventFired);
			assert.strictEqual(deselectEventFired, 2, 'Deselect event fired twice: ' + deselectEventFired);

			grid.deselect(4);
			assert.strictEqual(selectEventFired, 3, 'Select event fired three times: ' + selectEventFired);
			assert.strictEqual(deselectEventFired, 3, 'Deselect event fired three times: ' + deselectEventFired);

			grid.destroy();
		};

		notificationTests[name + ' events + no store + remove'] = function () {
			// Create selections, remove rows, watch for events
			var deselectEventFired = 0;

			grid = new (declare([Grid, SelectionMixin]))({
				columns: getColumns()
			});

			document.body.appendChild(grid.domNode);
			grid.startup();
			grid.renderArray(_createTestData());

			grid.on('dgrid-deselect', function () {
				deselectEventFired++;
			});

			grid.select(3);
			grid.select(4);
			assert.strictEqual(deselectEventFired, 0, 'Deselect event not fired: ' + deselectEventFired);

			grid.row(3).remove();
			assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

			grid.row(5).remove();
			assert.strictEqual(deselectEventFired, 1, 'Deselect event not fired again: ' + deselectEventFired);

			grid.row(4).remove();
			assert.strictEqual(deselectEventFired, 2, 'Deselect event fired a second time: ' + deselectEventFired);

			grid.destroy();
		};

		notificationTests[name + ' events + store + remove'] = function () {
			// Create selections, remove data, watch for events
			var store = new TrackableMemory({
					data: _createTestData()
				}),
				selectEventFired,
				deselectEventFired;

			grid = new (declare([OnDemandGrid, SelectionMixin]))({
				columns: getColumns(),
				collection: store,
				sort: 'id'
			});

			document.body.appendChild(grid.domNode);
			grid.startup();

			grid.on('dgrid-select', function () {
				selectEventFired++;
			});
			grid.on('dgrid-deselect', function () {
				deselectEventFired++;
			});

			function testEvents() {
				selectEventFired = 0;
				deselectEventFired = 0;
				grid.select(3);
				grid.select(4);
				assert.strictEqual(deselectEventFired, 0, 'Deselect event not fired: ' + deselectEventFired);

				// Reset the select event counter.  It should not fire on remove.
				selectEventFired = 0;

				store.remove(3);
				assert.strictEqual(selectEventFired, 0, 'Select event not fired: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 1, 'Deselect event fired once: ' + deselectEventFired);

				store.remove(5);
				assert.strictEqual(selectEventFired, 0, 'Select event not fired: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 1, 'Deselect event not fired again: ' + deselectEventFired);

				store.remove(4);
				assert.strictEqual(selectEventFired, 0, 'Select event not fired: ' + selectEventFired);
				assert.strictEqual(deselectEventFired, 2, 'Deselect event fired a second time: ' + deselectEventFired);
			}

			// Test the events
			testEvents();
			// Change the store
			store = new TrackableMemory({
				data: _createTestData()
			});
			grid.set('collection', store);
			// Test the events again
			testEvents();

			grid.destroy();
		};
	});

	tdd.suite('Selection update handling', function () {
		tdd.afterEach(function () {
			grid.destroy();
		});

		for (var name in notificationTests) {
			tdd.test(name, notificationTests[name]);
		}
	});

	tdd.suite('Selection events', function () {
		var store = new TrackableMemory({
			data: _createTestData()
		});
		var handles = [];

		tdd.beforeEach(function () {
			grid = new (declare([OnDemandGrid, Selection]))({
				columns: getColumns(),
				sort: 'id',
				collection: store
			});
			document.body.appendChild(grid.domNode);
			grid.startup();
		});

		tdd.afterEach(function () {
			grid.destroy();
			for (var i = handles.length; i--;) {
				handles[i].remove();
			}
			handles = [];
		});

		tdd.test('programmatic row deselection event', function () {
			var lastEventType,
				expectedEventType = 'dgrid-deselect',
				eventCount = 0;

			grid.select('1');

			// Intentionally check for both select and deselect events -
			// we should only receive a single deselect event
			grid.on('dgrid-select, dgrid-deselect', function (event) {
				lastEventType = event.type;
				eventCount++;
			});

			grid.deselect('1');
			grid.deselect('1');

			assert.equal(eventCount, 1);
			assert.equal(expectedEventType, lastEventType);
		});

		tdd.test('programmatic row selection event', function () {
			var lastEventType,
				expectedEventType = 'dgrid-select',
				eventCount = 0;

			grid.on('dgrid-select, dgrid-deselect', function (event) {
				lastEventType = event.type;
				eventCount++;
			});

			grid.select('1');
			grid.select('1');

			assert.equal(eventCount, 1);
			assert.equal(expectedEventType, lastEventType);
		});

		tdd.test('clearSelection() within event handler', function () {
			var dfd = this.async();
			var numCalls = 0;
			handles.push(grid.on('dgrid-select', dfd.rejectOnError(function () {
				numCalls++;
				assert.isTrue(numCalls < 2, 'dgrid-select handler should only fire once');
				// clearSelection will cause selection events to be fired,
				// but that should not include the originally-queued event
				grid.clearSelection();
			})));

			grid.select('1');

			// Since this test passes on 1 event firing but fails on multiple,
			// resolve on a small timeout (since failure will occur instantaneously)
			setTimeout(function () { dfd.resolve(); }, 100);
		});
	});
});
