define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-class',
	'dojo/keys',
	'dojo/on',
	'dojo/topic',
	'dijit/form/Button',
	'dijit/form/TextBox',
	'dijit/layout/ContentPane',
	'dgrid/OnDemandGrid',
	'dgrid/Editor',
	'dgrid/extensions/DijitRegistry',
	'dgrid/extensions/DnD',
	'dstore/Memory',
	'dstore/Trackable'
], function (declare, lang, domClass, keys, on, topic, Button, TextBox, ContentPane, OnDemandGrid, Editor,
	DijitRegistry, DnD, MemoryStore, TrackableMixin) {

	function renderDragSourceCell (item, value, node) {
		domClass.add(node, 'dojoDndHandle');
		node.innerHTML = '<i class="fa fa-bars" title="Drag to move"></i>';
	}

	return declare(ContentPane, {
		buildRendering: function () {
			this.inherited(arguments);

			this.store = new (declare([MemoryStore, TrackableMixin]))();

			this.grid = new (declare([OnDemandGrid, Editor, DnD, DijitRegistry], {
				columns: {
					dragSource: {
						label: '',
						renderCell: renderDragSourceCell
					},
					fieldName: {
						field: 'field',
						label: 'Field Name',
						editor: 'text',
						autoSave: true,
						sortable: false
					},
					label: {
						field: 'label',
						label: 'Label',
						editor: 'text',
						autoSave: true,
						sortable: false
					},
					config: {
						label: '',
						formatter: function () {
							return '<i class="fa fa-times" title="Delete"></i> ' +
								'<i class="fa fa-cog" title="Edit"></i>';
						},
						sortable: false
					}
				},
				dndParams: {
					withHandles: true
				}
			}))({
				collection: this.store,
				className: 'columnGrid'
			});

			this.fieldNameTextBox = new TextBox({
				class: 'columnInfoTextBox',
				placeHolder: 'Field name'
			});

			this.fieldLabelTextBox = new TextBox({
				class: 'columnInfoTextBox',
				placeHolder: 'Field label'
			});

			this.addColumnButton = new Button({
				label: 'Add column'
			});

			this.addChild(this.fieldNameTextBox);
			this.addChild(this.fieldLabelTextBox);
			this.addChild(this.addColumnButton);
			this.addChild(this.grid);
		},

		postCreate: function () {
			this.own(
				this.fieldNameTextBox.on('keypress', lang.hitch(this, '_onFieldNameKeyPress')),
				this.fieldLabelTextBox.on('keypress', lang.hitch(this, '_onFieldLabelKeyPress')),
				this.addColumnButton.on('click', lang.hitch(this, '_addColumn')),
				this.store.on(['add', 'remove', 'update'], lang.hitch(this, '_onStoreChange')),
				this.grid.on('.fa-times:click', lang.hitch(this, '_removeColumn')),
				this.grid.on('.fa-cog:click', lang.hitch(this, '_editColumn')),
				topic.subscribe('/column/changed', lang.hitch(this, '_onColumnChange'))
			);
		},

		_getColumnsAttr: function () {
			return this.store.fetchSync();
		},

		_onFieldNameKeyPress: function (event) {
			if (event.keyCode === keys.ENTER) {
				this.fieldLabelTextBox.focus();
			}
		},

		_onFieldLabelKeyPress: function (event) {
			if (event.keyCode === keys.ENTER) {
				this._addColumn();
			}
		},

		// Add a column to the store from the UI values
		_addColumn: function () {
			var fieldName = this.fieldNameTextBox.get('value');
			var fieldLabel = this.fieldLabelTextBox.get('value');
			var columnObject;

			if (fieldName) {
				columnObject = {
					field: fieldName,
					label: fieldLabel || ''
				};

				this.store.put(columnObject);

				this.fieldNameTextBox.set('value', '');
				this.fieldLabelTextBox.set('value', '');
			}

			this.fieldNameTextBox.focus();
		},

		// Removed the clicked column from the store
		_removeColumn: function (event) {
			var row = this.grid.row(event);
			this.store.remove(row.data.id);
		},

		// Show the column configuration for a column
		_editColumn: function (event) {
			var row = this.grid.row(event);

			// Let the ColumnEditor know that is should set the form data and display the form
			this.emit('editcolumn', { data: row.data } );
		},

		_onColumnChange: function (value) {
			this.store.put(value);
		},

		_onStoreChange: function () {
			// Let the Builder know that is should update the demo display (grid or generated code)
			topic.publish('/configuration/changed');
			// Let the Tree config module know that is should update its list of column names
			topic.publish('/store/columns/update', this.store);
		}
	});
});
