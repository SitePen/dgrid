define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/topic',
	'dgrid/OnDemandGrid',
	'dgrid/Tree',
	'dgrid/Editor',
	'dgrid/extensions/DijitRegistry',
	'dijit/Tooltip',
], function (arrayUtil, declare, lang, topic, OnDemandGrid, Tree, Editor, DijitRegistry, Tooltip) {
	// Render the label cell, adding the doc link, tooltip icon, and config icon when appropriate
	function renderLabelCell (item, value, node) {
		var cellValue = item.label;

		if (item.documentationUrl) {
			cellValue = '<a href="' + item.documentationUrl + '" target="_blank">' + cellValue;
			cellValue += '</a> <i class="fa fa-external-link"></i>';
		}

		if (item.info) {
			cellValue += ' <i class="fa fa-info-circle"></i>';
		}

		// If configModule has not been defined there's no config widget to display
		if (item.configLevel === 'grid' && item.configModule) {
			cellValue += ' <i class="fa fa-cog"></i>';
		}

		node.innerHTML = cellValue;
	}

	return declare([OnDemandGrid, Tree, Editor, DijitRegistry], {
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
			this.on('.fa-info-circle:mouseover', lang.hitch(this, '_showInfoTip'));
			this.on('.fa-info-circle:mouseout', lang.hitch(this, '_hideInfoTip'));
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

				case 'dgrid/Tree':
					// fall through
				case 'dgrid/extensions/Pagination':
					otherRow = collection.filter({ mid: 'dgrid/OnDemandGrid' }).fetchSync()[0];

					// If the user clicks to select Pagination...
					if (event.value) {
						// ...and OnDemandGrid was not selected, then we can assume gridType is 'array' and we need to
						// switch it to 'store-based' (OnDemandGrid)
						if (!otherRow.selected) {
							topic.publish('/set/gridtype', 'OnDemandGrid');
						}

						// ...but then we actually want to deselect OnDemandGrid
						otherRow.selected = false;
						collection.put(otherRow);
					}
					// If the user clicks to deselect Pagination then we want to select OnDemandGrid
					else {
						otherRow.selected = true;
						collection.put(otherRow);
					}

					break;

				case 'dgrid/extensions/DnD':
					// If the user clicks to select DnD, make sure a store-based config is active:
					// 1. If OnDemandGrid or Pagination is already selected, a store is in use
					// 2. Otherwise select OnDemandGrid
					if (event.value) {
						otherRow = collection.filter({
							mid: /dgrid\/(OnDemandGrid|extensions\/Pagination)/,
							selected: true
						}).fetchSync();

						if (!otherRow.length) {
							// Tell the Builder to set the grid type to OnDemandGrid
							topic.publish('/set/gridtype', 'OnDemandGrid');
						}
					}

					break;
			}
		},

		shouldExpand: function () {
			return true;
		},

		insertRow: function () {
			// This method ensures that the editor (checkbox) rendered for the Grid and OnDemandGrid rows
			// is always disabled

			var rowNode = this.inherited(arguments);
			var cell = this.cell(rowNode, 'selected');

			switch (cell.row.data.mid) {
				case 'dgrid/Grid':
					// fall through
				case 'dgrid/OnDemandGrid':
					cell.element.input.disabled = true;
					break;
			}

			return rowNode;
		},

		_setGridModule: function (module) {
			// 'module' should be either 'Grid' or 'OnDemandGrid'

			var collection = this.collection.root || this.collection;
			var items = collection.filter({ mid: 'dgrid/OnDemandGrid' }).fetchSync();

			// Select/deselect OnDemandGrid depending on 'module'
			items[0].selected = module !== 'Grid';
			collection.put(items[0]);

			if (module === 'Grid') {
				// Tree, DnD and Pagination require a store/collection, so if module is set to 'Grid' deselect them
				items = collection.filter({
					mid: /dgrid\/(Tree|\/extensions\/(DnD|Pagination))/,
					selected: true
				}).fetchSync();

				arrayUtil.forEach(items, function (item) {
					item.selected = false;
					collection.put(item);
				});
			}
		},

		_showInfoTip: function (event) {
			var row = this.row(event);

			Tooltip.show(row.data.info, event.target, ['after']);
		},

		_hideInfoTip: function (event) {
			Tooltip.hide(event.target);
		}
	});
});
