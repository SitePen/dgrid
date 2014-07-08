define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-construct',
	'dojo/topic',
	'dojo/when',
	'./ConfigForm',
	'../MultiRowSingleSelect',
	'dojo/text!./templates/Tree.html',
	'dgrid/Tree',
	// for template
	'dijit/form/RadioButton'
], function (declare, lang, domConstruct, topic, when, ConfigForm, MultiRowSingleSelect, template, Tree) {
	return declare(ConfigForm, {
		templateString: template,
		defaultsObject: Tree.prototype,

		postCreate: function () {
			this.inherited(arguments);

			this.expandoSelect = new MultiRowSingleSelect({
				name: 'renderExpando',
				size: 8,
				className: 'expandoSelect'
			}, this.expandoSelectNode);

			this.own(
				topic.subscribe('/store/columns/update', lang.hitch(this, '_updateColumnNames'))
			);
		},

		_updateColumnNames: function (columnStore) {
			var self = this;
			var fragment = document.createDocumentFragment();

			when(columnStore.fetch().forEach(function (column) {
				domConstruct.create('option', {
					value: column.field,
					innerHTML: column.field
				}, fragment);
			})).then(function () {
				domConstruct.place(fragment, self.expandoSelect.containerNode, 'only');
			});
		},

		_getValueAttr: function () {
			var returnValue = this.inherited(arguments);

			// The renderExpando property needs to be specified on the column definition
			// (it's not a grid config property)
			delete returnValue.renderExpando;

			return returnValue;
		},

		_getExpandoColumnAttr: function () {
			return this.expandoSelect.get('value');
		}
	});
});
