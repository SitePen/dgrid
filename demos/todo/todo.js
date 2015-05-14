define([
	'dgrid/OnDemandGrid',
	'dgrid/Selection',
	'dgrid/Editor',
	'dgrid/extensions/DnD',
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/json',
	'dojo/on',
	'dstore/Memory',
	'dstore/Trackable',
	'dojo/domReady!'
], function (OnDemandGrid, Selection, Editor, DnD, declare, domConstruct, JSON, on, Memory, Trackable) {
	// Create DOM
	var container = domConstruct.create('div', { id: 'container' });
	var itemForm = domConstruct.create('form', { className: 'actionArea topArea', id: 'itemForm' }, container);
	var taskField = domConstruct.create('input', { id: 'txtTask', name: 'task' }, itemForm);
	domConstruct.create('button', { innerHTML: 'add', type: 'submit' }, itemForm);

	var listNode = domConstruct.create('div', { id: 'list' }, container);
	var removeArea = domConstruct.create('div', { className: 'actionArea bottomArea' }, container);
	var removeSelectedButton = domConstruct.create('button', { innerHTML: 'Remove Selected', type: 'button' },
			removeArea);
	var removeCompletedButton = domConstruct.create('button', { innerHTML: 'Remove Completed', type: 'button' },
			removeArea);

	document.body.appendChild(container);

	var storeMixins = [ Memory, Trackable ];

	if (window.localStorage) {
		// add functionality for saving/recalling from localStorage
		storeMixins.push(declare(null, {
			STORAGE_KEY: 'dgrid_demo_todo_list',

			constructor: function () {
				var self = this;
				var jsondata = localStorage[this.STORAGE_KEY];

				jsondata && this.setData(JSON.parse(jsondata));

				this.on('add, update, delete', function () {
					localStorage[self.STORAGE_KEY] = JSON.stringify(self.fetchSync());
				});
			}
		}));
	}

	var Store = declare(storeMixins);

	var store = new Store({
		idProperty: 'summary'
	});

	var grid = new (declare([OnDemandGrid, Selection, DnD, Editor]))({
		collection: store,
		columns: {
			completed: {
				editor: 'checkbox',
				label: ' ',
				autoSave: true,
				sortable: false
			},
			summary: {
				field: '_item', // get whole item for use by formatter
				label: 'TODOs',
				sortable: false,
				formatter: function (item) {
					return '<div' + (item.completed ? ' class="completed"' : '') +
						'>' + item.summary + '</div>';
				}
			}
		}
	}, listNode);

	on(itemForm, 'submit', function (event) {
		event.preventDefault();

		// allow overwrite if already exists (by using put, not add)
		store.put({
			completed: false,
			summary: taskField.value
		});
		taskField.value = '';
	});

	on(removeSelectedButton, 'click', function () {
		for (var i in grid.selection) {
			// Each key in the selection map is the id of the item,
			// so we can pass it directly to store.remove.
			store.remove(i);
		}
	});

	on(removeCompletedButton, 'click', function () {
		// query for all completed items and remove them
		store.filter({ completed: true }).fetch().forEach(function (item) {
			store.remove(item[store.idProperty]);
		});
	});

	if (window.localStorage) {
		// add extra button to clear the localStorage key we're using
		var button = domConstruct.create('button', {
			innerHTML: 'Clear localStorage',
			type: 'button'
		}, removeArea);

		on(button, 'click', function () {
			localStorage.removeItem(store.STORAGE_KEY);
			// remove all items in grid the quick way (no need to iteratively remove)
			store.setData([]);
			grid.refresh();
		});
	}
});
