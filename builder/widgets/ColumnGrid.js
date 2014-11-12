define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-class',
	'dojo/topic',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'./_ResizeMixin',
	'dojo/i18n!../nls/builder',
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
	'dijit/form/TextBox'
], function (declare, lang, domClass, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _ResizeMixin, i18n,
	template, OnDemandGrid, Editor, DijitRegistry, DnD, Memory, Trackable) {

	function renderDragSourceCell(item, value, node) {
		domClass.add(node, 'dojoDndHandle');
		node.innerHTML = '<i class="icon-navicon" title="' + i18n.dragToMove + '"></i>';
	}

	return declare([ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _ResizeMixin ], {
		baseClass: 'columnGridContainer',
		templateString: template,
		i18n: i18n,

		buildRendering: function () {
			this.inherited(arguments);

			this.store = new (declare([ Memory, Trackable ]))();

			this.grid = new (declare([ OnDemandGrid, Editor, DnD, DijitRegistry ], {
				columns: {
					dragSource: {
						label: '',
						renderCell: renderDragSourceCell,
						sortable: false
					},
					label: {
						field: 'label',
						label: i18n.label,
						autoSave: true,
						sortable: false
					},
					config: {
						label: '',
						formatter: function () {
							return '<i class="icon-times" title="' + i18n['delete'] + '"></i>' +
								'<i class="icon-gear" title="' + i18n.edit + '"></i> ';
						},
						sortable: false
					}
				},
				showHeader: false,
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
				this.store.on('add,delete,update', lang.hitch(this, '_onStoreChange')),
				this.grid.on('.icon-times:click', lang.hitch(this, 'removeColumn')),
				this.grid.on('.icon-gear:click', lang.hitch(this, '_editColumn')),
				topic.subscribe('/column/changed', lang.hitch(this, '_onColumnChange'))
			);
		},

		_getColumnsAttr: function () {
			return this.store.fetchSync();
		},

		addColumn: function (label) {
			// summary:
			//		Adds a column to the store with the given label;
			//		the column's field name will be based on the label provided
			this.store.put({
				field: label.replace(/[^\w-]/g, '_'),
				label: label
			});
		},

		removeColumn: function (target) {
			// summary:
			//		Removes the column from the store corresponding to the given target
			//		(whether an event, element, ID, or item)

			this.store.remove(this.grid.row(target).id);
		},

		_onFormSubmit: function (event) {
			// summary:
			//		Adds a column to the store from the UI values

			event.preventDefault();
			var form = this.columnGridForm;
			var value = form.get('value');

			if (!value.label) {
				return;
			}

			this.addColumn(value.label);

			form.reset();
			this.fieldLabelTextBox.focus();
		},

		_editColumn: function (event) {
			// summary:
			//		Shows the column configuration for a column

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
