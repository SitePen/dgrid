define([
	'dojo/_base/declare',
	'./ConfigForm',
	'dojo/text!./templates/Selection.html',
	'dgrid/Selection',
	'../MultiRowSingleSelect',
	// for template
	'dijit/form/RadioButton'
], function (declare, ConfigForm, template, Selection, MultiRowSingleSelect) {
	return declare(ConfigForm, {
		templateString: template,
		defaultsObject: Selection.prototype,

		postCreate: function () {
			this.inherited(arguments);

			this.modeSelect = new MultiRowSingleSelect({
				name: 'selectionMode',
				size: 5,
				className: 'modeSelect'
			}, this.modeSelectNode);
		},

		_clearField: function (event) {
			var fieldName = event.target.getAttribute('data-field-name');
			var formValue = this.get('value');

			if (!fieldName) {
				return;
			}

			if (fieldName in formValue) {
				formValue[fieldName] = '';
				this.set('value', formValue);
			}
		}
	});
});
