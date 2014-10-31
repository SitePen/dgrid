define([
	'require',
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/topic',
	'dstore/Memory',
	'dstore/Trackable',
	'dstore/Tree',
	'dijit/layout/StackContainer',
	'./FeatureGrid',
	'../data/features'
], function (require, arrayUtil, declare, lang, topic, Memory, Trackable, Tree, StackContainer, FeatureGrid,
		featureData) {

	return declare(StackContainer, {
		baseClass: 'featureEditor',

		buildRendering: function () {
			this.inherited(arguments);

			var self = this;
			var configModuleIds = [];

			this.configPanes = {};

			this.store = new (declare([ Memory, Trackable ]))({
				data: featureData
			});

			this.featureGrid = new FeatureGrid({
				store: this.store,
				featureType: 'grid'
			});
			this.addChild(this.featureGrid);

			arrayUtil.forEach(featureData, function (feature) {
				if (feature.configModule) {
					configModuleIds.push('./' + feature.configModule);
				}
			});

			require(configModuleIds, function () {
				arrayUtil.forEach(featureData, function (feature) {
					var ConfigConstructor;
					var configPane;

					if (feature.configModule !== undefined) {
						ConfigConstructor = require('./' + feature.configModule);
						configPane = new ConfigConstructor({
							moduleName: feature.mid.slice(feature.mid.lastIndexOf('/') + 1),
							documentationUrl: feature.documentationUrl
						});

						configPane.on('close', function () {
							self.selectChild(self.featureGrid);
						});

						this.addChild(configPane);
						this.configPanes[feature.mid] = configPane;
					}
				}, self);
			});
		},

		postCreate: function () {
			this.inherited(arguments);

			this.own(
				this.featureGrid.on('configure-module', lang.hitch(this, '_showModuleConfig')),
				this.store.on(['add', 'delete', 'update'], lang.hitch(this, '_onUpdateStore'))
			);
		},

		isSelected: function (moduleId) {
			return this.store.filter({ mid: moduleId, selected: true }).fetchSync().length;
		},

		filter: function (query) {
			return this.store.filter(query).fetchSync();
		},

		getModuleConfig: function (mid) {
			return this.configPanes[mid] && this.configPanes[mid].get('value');
		},

		_showModuleConfig: function (event) {
			var configPane = this.configPanes[event.mid];
			if (configPane) {
				this.selectChild(configPane);
			}
		},

		_onUpdateStore: function () {
			// Let the Builder know that is should update the demo display (grid or generated code)
			topic.publish('/configuration/changed');
		},

		_getExpandoColumnAttr: function () {
			return this.configPanes['dgrid/Tree'].get('expandoColumn');
		},

		_setFeatureTypeAttr: function (featureType) {
			this.featureGrid.set('featureType', featureType);
		}
	});
});
