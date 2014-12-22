define([
	'require',
	'dgrid/OnDemandGrid',
	'dgrid/Selection',
	'dgrid/Keyboard',
	'dojo/_base/declare',
	'dojo/dom-construct',
	'dojo/dom-class',
	'dojo/on',
	'dstore/RequestMemory',
	'dojo/text!./resources/description.html',
	'dojo/query'
], function (require, Grid, Selection, Keyboard, declare, domConstruct, domClass, on, RequestMemory, descriptionHtml) {
	// Render DOM
	var containerNode = domConstruct.create('div', null, document.body);
	var switchNode = domConstruct.create('div', { className: 'controls', innerHTML: 'Select View: ' });
	var tableButton = domConstruct.create('button', { innerHTML: 'Table', type: 'button' }, switchNode);
	var detailsButton = domConstruct.create('button', { innerHTML: 'Details', type: 'button' }, switchNode);
	var galleryButton = domConstruct.create('button', { innerHTML: 'Gallery', type: 'button' }, switchNode);
	var contentNode = domConstruct.create('div', { className: 'content' });
	var gridNode;

	var grid;
	var store;
	var expandoListener;
	var expandedNode;
	var renderers = {
		gallery: function (obj) {
			// function used for renderRow for gallery view (large tiled thumbnails)
			return domConstruct.create('div', {
				innerHTML: '<div class="icon" style="background-image:url(resources/' +
					obj.icon + '-128.png);">&nbsp;</div><div class="name">' + obj.name + '</div>'
			});
		},
		details: function (obj) {
			// function used for renderRow for details view (items w/ summary)
			return domConstruct.create('div', {
				innerHTML: '<div class="icon" style="background-image:url(resources/' +
					obj.icon + '-64.png);">&nbsp;</div><div class="name">' +
					obj.name + '</div><div class="summary">' + obj.summary + '</div>'
			});
		},
		table: function (obj) {
			var div = domConstruct.create('div', { className: 'collapsed' });
			div.appendChild(Grid.prototype.renderRow.apply(this, arguments));
			var summaryDiv = domConstruct.create('div', { className: 'expando' }, div);
			summaryDiv.appendChild(document.createTextNode(obj.summary));
			return div;
		}
	};

	function makeViewClickHandler(view) {
		return function () {
			// pause/resume click listener for expando in "table" view
			expandoListener[view === 'table' ? 'resume' : 'pause']();
			// reset expanded node for table view
			expandedNode = null;
			// update renderRow function
			grid.renderRow = renderers[view];
			// update class on grid domNode
			domClass.replace(grid.domNode, view, 'table gallery details');
			// only show headers if we're in "table" view
			grid.set('showHeader', view === 'table');
			// force redraw of rows
			grid.refresh();
		};
	}

	containerNode.appendChild(switchNode);

	gridNode = domConstruct.create('div', { className: 'table', id: 'grid' }, contentNode);
	domConstruct.place(descriptionHtml, contentNode);
	containerNode.appendChild(contentNode);

	// Use require.toUrl for portability (looking up via module path)
	store = new RequestMemory({ target: require.toUrl('./data.json') });

	grid = new Grid({
		columns: [
			{
				label: ' ',
				field: 'icon',
				sortable: false,
				formatter: function (icon) {
					return '<div class="icon" style="background-image:url(resources/' +
						icon + '-32.png);">&nbsp;</div>';
				}
			},
			{ label: 'Package', field: 'id' },
			{ label: 'Name', field: 'name' }
		],
		collection: store,
		renderRow: renderers.table
	}, 'grid');

	// store initially-active renderRow as renderer for table view
	renderers.table = grid.renderRow;

	// listen for clicks to trigger expand/collapse in table view mode
	expandoListener = on.pausable(grid.domNode, '.dgrid-row:click', function (event) {
		var node = grid.row(event).element;
		var collapsed = domClass.contains(node, 'collapsed');

		// toggle state of node which was clicked
		domClass.toggle(node, 'collapsed', !collapsed);

		// if clicked row wasn't expanded, collapse any previously-expanded row
		collapsed && expandedNode && domClass.add(expandedNode, 'collapsed');

		// if the row clicked was previously expanded, nothing is expanded now
		expandedNode = collapsed ? node : null;
	});

	// switch views when buttons are clicked
	on(tableButton, 'click', makeViewClickHandler('table'));
	on(detailsButton, 'click', makeViewClickHandler('details'));
	on(galleryButton, 'click', makeViewClickHandler('gallery'));
});
