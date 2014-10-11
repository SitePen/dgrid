define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-class',
	'dojo/dom-geometry',
	'dojo/topic',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/text!./templates/ColumnGrid.html',
	'dgrid/OnDemandGrid',
	'dgrid/Editor',
	'dgrid/extensions/DijitRegistry',
	'dgrid/extensions/DnD',
	'dstore/Memory',
	'dstore/Trackable',
	// Widgets in template:
	'dijit/form/Form',
	'dijit/form/Button',
	'dijit/form/ValidationTextBox'
], function (declare, lang, domClass, domGeometry, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
	template, OnDemandGrid, Editor, DijitRegistry, DnD, Memory, Trackable) {

	function renderDragSourceCell (item, value, node) {
		domClass.add(node, 'dojoDndHandle');
		node.innerHTML = '<i class="icon-navicon" title="Drag to move"></i>';
	}

	return declare([ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin ], {
		baseClass: 'columnGridContainer',
		templateString: template,

		buildRendering: function () {
			this.inherited(arguments);

			this.store = new (declare([ Memory, Trackable ]))({
				idProperty: 'field'
			});

			this.grid = new (declare([ OnDemandGrid, Editor, DnD, DijitRegistry ], {
				columns: {
					dragSource: {
						label: '',
						renderCell: renderDragSourceCell,
						sortable: false
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
							return '<i class="icon-gear" title="Edit"></i> ' +
								'<i class="icon-times" title="Delete"></i>';
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
			}, this.gridNode);

			this._startupWidgets.push(this.grid);
		},

		postCreate: function () {
			this.inherited(arguments);
			this.own(
				this.store.on(['add', 'delete', 'update'], lang.hitch(this, '_onStoreChange')),
				this.grid.on('.icon-times:click', lang.hitch(this, '_removeColumn')),
				this.grid.on('.icon-gear:click', lang.hitch(this, '_editColumn')),
				topic.subscribe('/column/changed', lang.hitch(this, '_onColumnChange'))
			);
		},

		resize: function (changeSize) {
			if (changeSize) {
				domGeometry.setMarginBox(this.domNode, changeSize);
			}
			this.grid.resize();
			this.inherited(arguments);
		},

		_getColumnsAttr: function () {
			return this.store.fetchSync();
		},

		// Add a column to the store from the UI values
		_addColumn: function (event) {
			event.preventDefault();
			var form = this.columnGridForm;

			if (!form.validate()) {
				return;
			}

			var value = form.get('value');
			var columnObject;

			columnObject = {
				field: value.name,
				label: value.label
			};

			this.store.put(columnObject);

			form.reset();
			this.fieldNameTextBox.focus();
		},

		// Removed the clicked column from the store
		_removeColumn: function (event) {
			var row = this.grid.row(event);
			this.store.remove(row.id);
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
