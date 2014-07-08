define([
	'require',
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/aspect',
	'dojo/topic',
	'dstore/Memory',
	'dstore/Trackable',
	'dstore/Tree',
	'dijit/layout/StackContainer',
	'./FeatureGrid',
	'../data/features'
], function (require, arrayUtil, declare, lang, aspect, topic, MemoryStore, TrackableMixin, TreeMixin, StackContainer,
	FeatureGrid, featureData) {

	return declare(StackContainer, {
		baseClass: 'featureEditor',

		buildRendering: function () {
			this.inherited(arguments);

			var self = this;
			var configModuleIds = [];

			this.configPanes = {};

			this.store = new (declare([MemoryStore, TrackableMixin, TreeMixin], {
				mayHaveChildren: function (item) {
					return !('parentId' in item);
				},
				getChildren: function (item) {
					return this.root.filter({ parentId: item.id });
				}
			}))({
				data: featureData
			});

			this.grid = new FeatureGrid({
				collection: this.store.filter('mayHaveChildren'),
				className: 'featureGrid'
			});
			this.addChild(this.grid);

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
							moduleName: feature.mid.substr(feature.mid.lastIndexOf('/') + 1),
							documentationUrl: feature.documentationUrl
						});

						self.addChild(configPane);
						self.configPanes[feature.mid] = configPane;

						self.own(
							aspect.after(configPane, 'onClose', function () {
								self.selectChild(self.grid);
							})
						);
					}
				});
			});
		},

		postCreate: function () {
			this.inherited(arguments);

			this.own(
				this.grid.on('.fa-cog:click', lang.hitch(this, '_showModuleConfig')),
				this.store.on(['add', 'remove', 'update'], lang.hitch(this, '_onUpdateStore'))
			);
		},

		isSelected: function (moduleId) {
			return this.store && this.store.filter({ mid: moduleId, selected: true }).fetchSync().length;
		},

		filter: function (query) {
			return this.store && this.store.filter(query).fetchSync();
		},

		getModuleConfig: function (mid) {
			return this.configPanes[mid] && this.configPanes[mid].get('value');
		},

		_showModuleConfig: function (event) {
			var row = this.grid.row(event);
			var configPane = this.configPanes[row.data.mid];

			if (configPane) {
				this.selectChild(configPane);
			}
		},

		_onUpdateStore: function () {
			// Let the Builder know that is should update the demo display (grid or generated code)
			topic.publish('/configuration/changed');
		},

		_setGridModuleAttr: function (value) {
			var paginationRow;

			this.grid.set('gridModule', value);

			if (value === 'OnDemandGrid') {
				paginationRow = this.store.filter({ mid: 'dgrid/extensions/Pagination', selected: true }).fetchSync()[0];

				if (paginationRow) {
					paginationRow.selected = false;
					this.store.put(paginationRow);
				}
			}
		},

		_getExpandoColumnAttr: function () {
			return this.configPanes['dgrid/Tree'].get('expandoColumn');
		}
	});
});
