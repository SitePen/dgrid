/**
REQUIRED
	id (Number): unique; sort key (any modules that depend on being loaded after another module should have a higher id)
	label (String): Display value for the feature

OPTIONAL
	parentId (Number): id of the parent object
	mid (String): absolute mid of the module that provides the feature
	configLevel (String): if 'grid', feature will be applied to grid settings; otherwise feature will be applied to each
		column's settings
	configModule (String): relative (to the 'widgets' folder) mid of the module that provides the configuration UI
	info (String): Tooltip text - longer description of the feature
*/
define([], function () {
	var baseUrl = 'https://github.com/SitePen/dgrid/blob/dev-0.4/';

	return [
		{
			id: 0,
			label: 'Grid features'
		},
		{
			id: 1.1,
			parentId: 0,
			mid: 'dgrid/Grid',
			label: 'Grid',
			configLevel: 'grid',
			configModule: 'configForms/Grid',
			documentationUrl: baseUrl + 'doc/components/core-components/Grid.md',
			selected: true
		},
		{
			id: 1.2,
			parentId: 0,
			mid: 'dgrid/OnDemandGrid',
			label: 'OnDemandGrid',
			configLevel: 'grid',
			configModule: 'configForms/OnDemandGrid',
			documentationUrl: baseUrl + 'doc/components/core-components/OnDemandList-and-OnDemandGrid.md',
			selected: true
		},
		{
			id: 2,
			parentId: 0,
			mid: 'dgrid/Keyboard',
			label: 'Keyboard',
			configLevel: 'grid',
			configModule: 'configForms/Keyboard',
			documentationUrl: baseUrl + 'doc/components/mixins/Keyboard.md',
			info: 'Keyboard navigation and selection'
		},
		{
			id: 3,
			parentId: 0,
			mid: 'dgrid/Selection',
			label: 'Row Selection',
			configLevel: 'grid',
			configModule: 'configForms/Selection',
			documentationUrl: baseUrl + 'doc/components/mixins/Selection.md',
			info: 'Row selection'
		},
		{
			id: 4,
			parentId: 0,
			mid: 'dgrid/CellSelection',
			label: 'Cell selection',
			configLevel: 'grid',
			configModule: 'configForms/CellSelection',
			documentationUrl: baseUrl + 'doc/components/mixins/CellSelection.md',
			info: 'Cell selection'
		},
		{
			id: 5,
			parentId: 0,
			mid: 'dgrid/Tree',
			label: 'Tree',
			configLevel: 'grid',
			configModule: 'configForms/Tree',
			documentationUrl: baseUrl + 'doc/components/mixins/Tree.md',
			info: 'Render hierarchical data under collapsible nodes'
		},
		{
			id: 6,
			parentId: 0,
			mid: 'dgrid/extensions/Pagination',
			label: 'Pagination',
			configLevel: 'grid',
			configModule: 'configForms/Pagination',
			documentationUrl: baseUrl + 'doc/components/extensions/Pagination.md',
			info: 'Paged data views'
		},
		{
			id: 7,
			parentId: 0,
			mid: 'dgrid/extensions/DijitRegistry',
			label: 'Dijit registry',
			documentationUrl: baseUrl + 'doc/components/extensions/DijitRegistry.md',
			info: 'Add dgrid to Dijit\'s registry'
		},
		{
			id: 8,
			parentId: 0,
			mid: 'dgrid/extensions/DnD',
			label: 'Row drag and drop',
			configLevel: 'grid',
			documentationUrl: baseUrl + 'doc/components/extensions/DnD.md',
			info: 'Re-order rows with drag and drop'
		},
		{
			id: 1,
			label: 'Column features'
		},
		{
			id: 9,
			parentId: 1,
			mid: 'dgrid/Editor',
			label: 'Editor',
			documentationUrl: baseUrl + 'doc/components/mixins/Editor.md',
			info: 'Edit values in grid cells'
		},
		{
			id: 10,
			parentId: 1,
			mid: 'dgrid/extensions/ColumnHider',
			label: 'Column hider',
			documentationUrl: baseUrl + 'doc/components/extensions/ColumnHider.md',
			info: 'UI to show or hide individual columns'
		},
		{
			id: 11,
			parentId: 1,
			mid: 'dgrid/extensions/ColumnReorder',
			label: 'Column reorder',
			documentationUrl: baseUrl + 'doc/components/extensions/ColumnReorder.md',
			info: 'Re-order columns with drag and drop'
		},
		{
			id: 12,
			parentId: 1,
			mid: 'dgrid/extensions/ColumnResizer',
			label: 'Column resize',
			configLevel: 'grid',
			configModule: 'configForms/ColumnResizer',
			documentationUrl: baseUrl + 'doc/components/extensions/ColumnResizer.md',
			info: 'Resize columns'
		},
		// There's no UI for configuring CompoundColumns or ColumnSet, so just omit them
/*
		{
			id: 13,
			parentId: 1,
			mid: 'dgrid/extensions/CompoundColumns',
			label: 'Compound column headers',
			documentationUrl: baseUrl + 'doc/components/extensions/CompoundColumns.md',
			info: 'Define column headers that span multiple grid columns'
		},
		{
			id: 14,
			parentId: 1,
			mid: 'dgrid/ColumnSet',
			label: 'Fixed column sets',
			documentationUrl: baseUrl + 'doc/components/mixins/ColumnSet.md',
			info: 'Define column sets that scroll independently'
		},
*/
		{
			id: 15,
			parentId: 1,
			mid: 'dgrid/Selector',
			label: 'Row selection column',
			documentationUrl: baseUrl + 'doc/components/mixins/Selector.md',
			info: 'Define a column with checkboxes/radios for selecting rows'
		}
	];
});
