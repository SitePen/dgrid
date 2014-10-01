define([
	'dojo/_base/declare',
	'./ConfigForm',
	'../MultiRowSingleSelect',
	'dojo/text!./templates/OnDemandGrid.html',
	'dgrid/OnDemandGrid',
	// for template
	'dijit/form/NumberTextBox',
	'dijit/form/RadioButton'
], function (declare, ConfigForm, MultiRowSingleSelect, template, OnDemandGrid) {
	return declare(ConfigForm, {
		templateString: template,
		defaultsObject: OnDemandGrid.prototype,

		postCreate: function () {
			this.inherited(arguments);

			this.pagingMethodSelect = new MultiRowSingleSelect({
				name: 'pagingMethod',
				size: 3,
				className: 'pagingMethodSelect'
			}, this.pagingMethodSelectNode);

		},

		_getValueAttr: function () {
			var returnValue = this.inherited(arguments);
			var numericValue;

			if ('maxEmptySpace' in returnValue) {
				numericValue = +returnValue.maxEmptySpace;

				if (numericValue !== this.defaultsObject.maxEmptySpace &&
					!isNaN(numericValue)) {
					returnValue.maxEmptySpace = numericValue;
				}
				else {
					delete returnValue.maxEmptySpace;
				}
			}

			return returnValue;
		}
	});
});
