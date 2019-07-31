define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-construct',
	'dojo/on',
], function (declare, lang, domConstruct, on) {
	return declare(null, {
		renderHeader: function () {
			var grid = this;

			this.inherited(arguments);

			// create a additional column with the + icon to add a new row
			var cell = domConstruct.create('th', {className: "dgrid-cell dgrid-sortable dgrid-page-input", innerHTML: '➕'}, this.headerNode.firstChild.firstChild);
			on(cell, "click", function (e) {
				grid.addRow();
			});

		},
		renderRow: function (item, options) {
			var grid = this;
			var row = this.createRowCells('td', lang.hitch(this, '_createBodyRowCell'), options && options.subRows, item, options);
			var cell = domConstruct.create('td', {className: "dgrid-cell dgrid-sortable dgrid-page-input", innerHTML: '❌'}, row.firstChild);
			on(cell, "click", function (e) {
				grid.delRow(grid.row(e.target))
			});
			var div = domConstruct.create('div', { role: 'row' });
			div.appendChild(row);
			return div;
		},
		delRow: function(row) {
			this.collection.remove(row.data.id);
			this.removeRow(row);
		},
		addRow: function(data) {
			if (data === undefined) {
				data = {};
			}
			this.collection.add(data);
			this.refresh();
		}
	});
});
