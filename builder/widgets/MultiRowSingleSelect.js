define([
	'dojo/_base/declare',
	'dijit/form/MultiSelect'
], function (declare, MultiSelect) {
	/*
	 * Dijit's MultiSelect does not allow single-select mode. This widget extends MultiSelect to provide
	 * multiple rows visible in the UI, but only single selection.
	 */
	return declare(MultiSelect, {
		postCreate: function () {
			this.domNode.removeAttribute('multiple');
			this.multiple = false;
		},

		_setValueAttr: function (value) {
			this.inherited(arguments, [[value]]);
		},

		_getValueAttr: function () {
			var returnValue = this.inherited(arguments);

			return returnValue[0];
		}
	});
});
