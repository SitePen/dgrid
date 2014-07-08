define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/aspect',
	'dojo/topic',
	'dijit/layout/StackContainer',
	'dstore/Memory',
	'dstore/Trackable',
	'./ColumnConfigForm',
	'./ColumnGrid'
], function (declare, lang, aspect, topic, StackContainer, MemoryStore, TrackableMixin, ColumnConfigForm, ColumnGrid) {
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

			this.own(
				aspect.after(this.form, 'onClose', lang.hitch(this, '_showGrid')),
				this.columnGrid.on('editcolumn', lang.hitch(this, '_onEditColumn'))
			);
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
