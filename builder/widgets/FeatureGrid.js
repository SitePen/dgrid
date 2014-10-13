define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/topic',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'./_ResizeMixin',
	'dijit/Tooltip',
	'dgrid/OnDemandGrid',
	'dgrid/Tree',
	'dgrid/Editor',
	'dgrid/extensions/DijitRegistry',
	'dojo/text!./templates/FeatureGrid.html',
	// Widgets in template
	'dijit/form/Form',
	'dijit/form/RadioButton'
], function (arrayUtil, declare, lang, topic, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _ResizeMixin,
		Tooltip, OnDemandGrid, Tree, Editor, DijitRegistry, template) {

	function renderLabelCell (item, value, node) {
		// Render the label cell, adding the doc link, tooltip icon, and config icon when appropriate
		var cellValue = item.label;

		if (item.documentationUrl) {
			cellValue = '<a href="' + item.documentationUrl + '" target="_blank">' + cellValue + '</a>';
		}

		if (item.info) {
			cellValue += ' <i class="icon-info-circle"></i>';
		}

		// If configModule has not been defined there's no config widget to display
		if (item.configLevel === 'grid' && item.configModule) {
			cellValue += ' <i class="icon-gear"></i>';
		}

		node.innerHTML = cellValue;
	}

	var CustomGrid = declare([ OnDemandGrid, Tree, Editor, DijitRegistry ], {
		gridTypeForm: null, // Passed from FeatureGrid when instantiated

		columns: {
			label: {
				label: 'Select grid features',
				renderExpando: true,
				renderCell: renderLabelCell,
				sortable: false
			},
			selected: {
				label: '',
				editor: 'checkbox',
				autoSave: true,
				canEdit: function (item) {
					return 'parentId' in item;
				},
				sortable: false
			}
		},

		postCreate: function () {
			this.inherited(arguments);

			this.on('dgrid-datachange', lang.hitch(this, '_onDataChange'));
			this.on('.icon-info-circle:mouseover', lang.hitch(this, '_showInfoTip'));
			this.on('.icon-info-circle:mouseout', lang.hitch(this, '_hideInfoTip'));
		},

		_onDataChange: function (event) {
			var collection = this.collection.root || this.collection;
			var selectedMid = event.cell.row.data.mid;
			var otherRow;

			// Let the ColumnConfigForm know that a feature is selected/deselected so it can show/hide its config
			topic.publish('/feature/select', event.cell.row.data.mid, event.value);

			// Enforce mutual exclusivity between CellSelection-Selection and Pagination-OnDemandGrid
			switch (selectedMid) {
				case 'dgrid/Selection':
					if (event.value) {
						otherRow = collection.filter({ mid: 'dgrid/CellSelection', selected: true }).fetchSync()[0];

						if (otherRow) {
							otherRow.selected = false;
							collection.put(otherRow);
						}
					}

					break;

				case 'dgrid/CellSelection':
					if (event.value) {
						otherRow = collection.filter({ mid: 'dgrid/Selection', selected: true }).fetchSync()[0];

						if (otherRow) {
							otherRow.selected = false;
							collection.put(otherRow);
						}
					}

					break;

				case 'dgrid/extensions/Pagination':
					otherRow = collection.filter({ mid: 'dgrid/OnDemandGrid' }).fetchSync()[0];

					// If the user clicks to select Pagination...
					if (event.value) {
						// ...and OnDemandGrid was not selected, then we can assume gridType is array and we need to
						// switch it to store-based (OnDemandGrid)
						if (!otherRow.selected) {
							this.gridTypeForm.set('value', { gridType: 'OnDemandGrid' });
						}
						else {
							// ...but we actually want to deselect OnDemandGrid
							otherRow.selected = false;
							collection.put(otherRow);
						}
					}
					// If the user clicks to deselect Pagination then we want to select OnDemandGrid
					else {
						otherRow.selected = true;
						collection.put(otherRow);
					}

					break;

				case 'dgrid/Selector':
					// Fall through
				case 'dgrid/Tree':
					// Fall through
				case 'dgrid/extensions/DnD':
					// If the user selects a mixin or extension that requires a store,
					// make sure a store-based config is active:
					// 1. If OnDemandGrid or Pagination is already selected, a store is in use
					// 2. Otherwise select OnDemandGrid
					if (event.value) {
						otherRow = collection.filter({
							mid: /(OnDemandGrid|Pagination)$/,
							selected: true
						}).fetchSync();

						if (!otherRow.length) {
							this.gridTypeForm.set('value', { gridType: 'OnDemandGrid' });
						}
					}

					break;
			}
		},

		shouldExpand: function () {
			return true;
		},

		insertRow: function (object) {
			// This method ensures that the editor (checkbox) rendered for the Grid and OnDemandGrid rows
			// is always disabled

			var rowNode = this.inherited(arguments);
			var cell = this.cell(rowNode, 'selected');
			var mid = object.mid;

			if (mid === 'dgrid/Grid' || mid === 'dgrid/OnDemandGrid') {
				cell.element.input.disabled = true;
			}

			return rowNode;
		},

		_showInfoTip: function (event) {
			var row = this.row(event);

			Tooltip.show(row.data.info, event.target, ['after']);
		},

		_hideInfoTip: function (event) {
			Tooltip.hide(event.target);
		}
	});

	return declare([ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _ResizeMixin ], {
		className: 'featureGridContainer',
		templateString: template,

		collection: null,

		buildRendering: function () {
			this.inherited(arguments);
			this.grid = new CustomGrid({
				className: 'featureGrid',
				collection: this.collection,
				gridTypeForm: this.gridTypeForm
			}, this.gridNode);
			this._startupWidgets.push(this.grid);
		},

		postCreate: function () {
			var self = this;
			this.inherited(arguments);

			this.own(
				this.gridTypeForm.watch('value', function (name, oldValue, value) {
					self.set('gridModule', value.gridType);
				}),
				this.grid.on('.icon-gear:click', function (event) {
					self.emit('configure-module', { mid: self.grid.row(event).data.mid });
				})
			);
		},

		_setGridModuleAttr: function (module) {
			// 'module' should be either 'Grid' or 'OnDemandGrid'

			var collection = this.collection.root || this.collection;
			var items;

			if (module === 'OnDemandGrid') {
				// Select OnDemandGrid, unless Pagination is already selected
				items = collection.filter({
					mid: 'dgrid/extensions/Pagination',
					selected: true
				}).fetchSync();

				if (!items.length) {
					items = collection.filter({ mid: 'dgrid/OnDemandGrid' }).fetchSync();
					items[0].selected = true;
					collection.put(items[0]);
				}
			}
			else {
				// Deselect any modules that require a store
				items = collection.filter({
					mid: /\/(OnDemandGrid|Selector|Tree|extensions\/(DnD|Pagination))$/,
					selected: true
				}).fetchSync();

				arrayUtil.forEach(items, function (item) {
					item.selected = false;
					collection.put(item);
				});
			}
		}
	});
});
