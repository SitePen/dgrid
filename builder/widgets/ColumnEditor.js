define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-class',
	'dijit/_WidgetBase',
	'./ColumnConfigForm',
	'./ColumnGrid'
], function (declare, lang, domClass, _WidgetBase, ColumnConfigForm, ColumnGrid) {
	return declare(_WidgetBase, {
		baseClass: 'columnEditor',

		buildRendering: function () {
			this.inherited(arguments);

			// columnGrid is a ContentPane that contains a grid
			this.columnGrid = new ColumnGrid();
			this.form = new ColumnConfigForm();

			this.domNode.appendChild(this.columnGrid.domNode);
			this.domNode.appendChild(this.form.domNode);
		},

		postCreate: function () {
			this.inherited(arguments);

			this.form.on('close', lang.hitch(this, '_showGrid'));
			this.columnGrid.on('editcolumn', lang.hitch(this, '_onEditColumn'));
		},

		startup: function () {
			this.columnGrid.startup();
			this.form.startup();
		},

		_getColumnsAttr: function () {
			return this.columnGrid.get('columns');
		},

		_showGrid: function () {
			domClass.remove(this.domNode, 'slid');
		},

		_onEditColumn: function (event) {
			domClass.add(this.domNode, 'slid');
			this.form.set('value', event.data);
		}
	});
});
