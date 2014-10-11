define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dijit/layout/StackContainer',
	'./ColumnConfigForm',
	'./ColumnGrid'
], function (declare, lang, StackContainer, ColumnConfigForm, ColumnGrid) {
	return declare(StackContainer, {
		baseClass: 'columnEditor',

		buildRendering: function () {
			this.inherited(arguments);

			// columnGrid is a ContentPane that contains a grid
			this.columnGrid = new ColumnGrid();
			this.form = new ColumnConfigForm();

			this.addChild(this.columnGrid);
			this.addChild(this.form);
		},

		postCreate: function () {
			this.inherited(arguments);

			this.form.on('close', lang.hitch(this, '_showGrid'));
			this.columnGrid.on('editcolumn', lang.hitch(this, '_onEditColumn'));
		},

		_getColumnsAttr: function () {
			return this.columnGrid.get('columns');
		},

		_showGrid: function () {
			this.selectChild(this.columnGrid);
		},

		_onEditColumn: function (event) {
			this.form.set('value', event.data);
			this.selectChild(this.form);
		}
	});
});
