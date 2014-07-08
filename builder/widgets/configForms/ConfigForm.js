define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-construct',
	'dojo/on',
	'dojo/string',
	'dojo/topic',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dijit/form/_FormMixin',
	'dijit/form/Button'
], function (arrayUtil, declare, lang, domConstruct, on, string, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
	_FormMixin, Button) {

	return declare([ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _FormMixin ], {
		baseClass: 'configForm',
		documentationUrlTemplate: '<a href="${documentationUrl}" target="_blank">${moduleName} documentation</a> <i class="fa fa-external-link"></i>',

		// This should be over-ridden by sub-classes and define an object with properties that specify default
		// configuration values for the module
		defaultsObject: {},

		_isValueBroadcastEnabled: true,

		buildRendering: function () {
			this.inherited(arguments);

			var buttonBar;

			if (!this.containerNode) {
				this.containerNode = this.domNode;
			}

			buttonBar = domConstruct.create('div', {
				className: 'buttonBar'
			});

			this.doneButton = new Button({
				label: 'Done',
				className: 'doneButton',
				iconClass: 'fa fa-reply'
			});

			this.doneButton.placeAt(buttonBar);
			domConstruct.place(buttonBar, this.domNode, 'first');

			if (this.documentationUrl && this.moduleName) {
				domConstruct.place(string.substitute(this.documentationUrlTemplate, this), this.domNode);
			}
		},

		postCreate: function () {
			this.own(
				on(this.doneButton, 'click', lang.hitch(this, 'onClose')),
				this.watch('value', lang.hitch(this, function () {
					if (this._isValueBroadcastEnabled) {
						// Let the Builder know that is should update the demo display (grid or generated code)
						topic.publish('/configuration/changed');
					}
				}))
			);
		},

		startup: function () {
			this.inherited(arguments);

			// This must be done in startup: _FormMixin doesn't set this._descendants until startup
			this._setDefaultValues();
		},

		// hook for external modules
		onClose: function () {
		},

		_getValueAttr: function () {
			var returnValue = this.inherited(arguments);
			var property;

			// Remove properties that just give the default behavior
			for (property in returnValue) {
				// Values from RadioButtons are strings; convert true/false strings to boolean values
				if (returnValue[property] === 'true') {
					returnValue[property] = true;
				}
				else if (returnValue[property] === 'false') {
					returnValue[property] = false;
				}

				if (returnValue[property] === this.defaultsObject[property]) {
					delete returnValue[property];
				}
			}

			return returnValue;
		},

		_setDefaultValues: function () {
			var defaultValues = {};

			arrayUtil.forEach(this._descendants, function (widget) {
				if (widget.name && widget.name in this.defaultsObject) {
					defaultValues[widget.name] = String(this.defaultsObject[widget.name]);
				}
			}, this);

			this._isValueBroadcastEnabled = false;
			this.set('value', defaultValues);
			this._isValueBroadcastEnabled = true;
		}
	});
});
