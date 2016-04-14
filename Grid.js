define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/dom-construct',
	'dojo/dom-class',
	'dojo/on',
	'dojo/has',
	'./List',
	'./util/misc',
	'dojo/_base/sniff'
], function (declare, lang, domConstruct, domClass, listen, has, List, miscUtil) {
	function appendIfNode(parent, subNode) {
		if (subNode && subNode.nodeType) {
			parent.appendChild(subNode);
		}
	}

	function replaceInvalidChars(str) {
		// Replaces invalid characters for a CSS identifier with hyphen,
		// as dgrid does for field names / column IDs when adding classes.
		return miscUtil.escapeCssIdentifier(str, '-');
	}

	var Grid = declare(List, {
		columns: null,

		// hasNeutralSort: Boolean
		//		Determines behavior of toggling sort on the same column.
		//		If false, sort toggles between ascending and descending and cannot be
		//		reset to neutral without sorting another column.
		//		If true, sort toggles between ascending, descending, and neutral.
		hasNeutralSort: false,

		// cellNavigation: Boolean
		//		This indicates that focus is at the cell level. This may be set to false to cause
		//		focus to be at the row level, which is useful if you want only want row-level
		//		navigation.
		cellNavigation: true,

		tabableHeader: true,
		showHeader: true,
		column: function (target) {
			// summary:
			//		Get the column object by node, or event, or a columnId
			if (typeof target !== 'object') {
				return this.columns[target];
			}
			else {
				return this.cell(target).column;
			}
		},
		listType: 'grid',
		cell: function (target, columnId) {
			// summary:
			//		Get the cell object by node, or event, id, plus a columnId

			if (target.column && target.element) {
				return target;
			}

			if (target.target && target.target.nodeType) {
				// event
				target = target.target;
			}
			var element;
			if (target.nodeType) {
				do {
					if (this._rowIdToObject[target.id]) {
						break;
					}
					var colId = target.columnId;
					if (colId) {
						columnId = colId;
						element = target;
						break;
					}
					target = target.parentNode;
				} while (target && target !== this.domNode);
			}
			if (!element && typeof columnId !== 'undefined') {
				var row = this.row(target),
					rowElement = row && row.element;
				if (rowElement) {
					var elements = rowElement.getElementsByTagName('td');
					for (var i = 0; i < elements.length; i++) {
						if (elements[i].columnId === columnId) {
							element = elements[i];
							break;
						}
					}
				}
			}
			if (target != null) {
				return {
					row: row || this.row(target),
					column: columnId && this.column(columnId),
					element: element
				};
			}
		},

		createRowCells: function (tag, createCell, subRows, item, options) {
			// summary:
			//		Generates the grid for each row (used by renderHeader and and renderRow)
			var row = domConstruct.create('table', {
					className: 'dgrid-row-table',
					role: 'presentation'
				}),
				// IE < 9 needs an explicit tbody; other browsers do not
				tbody = (has('ie') < 9) ? domConstruct.create('tbody', null, row) : row,
				tr,
				si, sl, i, l, // iterators
				subRow, column, id, extraClasses, className,
				cell, colSpan, rowSpan; // used inside loops

			// Allow specification of custom/specific subRows, falling back to
			// those defined on the instance.
			subRows = subRows || this.subRows;

			for (si = 0, sl = subRows.length; si < sl; si++) {
				subRow = subRows[si];
				// for single-subrow cases in modern browsers, TR can be skipped
				// http://jsperf.com/table-without-trs
				tr = domConstruct.create('tr', null, tbody);
				if (subRow.className) {
					tr.className = subRow.className;
				}

				for (i = 0, l = subRow.length; i < l; i++) {
					// iterate through the columns
					column = subRow[i];
					id = column.id;

					extraClasses = column.field ?
						' field-' + replaceInvalidChars(column.field) :
						'';
					className = typeof column.className === 'function' ?
						column.className(item) : column.className;
					if (className) {
						extraClasses += ' ' + className;
					}

					cell = domConstruct.create(tag, {
						className: 'dgrid-cell' +
							(id ? ' dgrid-column-' + replaceInvalidChars(id) : '') + extraClasses,
						role: tag === 'th' ? 'columnheader' : 'gridcell'
					});
					cell.columnId = id;
					colSpan = column.colSpan;
					if (colSpan) {
						cell.colSpan = colSpan;
					}
					rowSpan = column.rowSpan;
					if (rowSpan) {
						cell.rowSpan = rowSpan;
					}
					createCell(cell, column, item, options);
					// add the td to the tr at the end for better performance
					tr.appendChild(cell);
				}
			}
			return row;
		},

		_createBodyRowCell: function (cellElement, column, item, options) {
			var cellData = item;

			// Support get function or field property (similar to DataGrid)
			if (column.get) {
				cellData = column.get(item);
			}
			else if ('field' in column && column.field !== '_item') {
				cellData = item[column.field];
			}

			if (column.renderCell) {
				// A column can provide a renderCell method to do its own DOM manipulation,
				// event handling, etc.
				appendIfNode(cellElement, column.renderCell(item, cellData, cellElement, options));
			}
			else {
				this._defaultRenderCell.call(column, item, cellData, cellElement, options);
			}
		},

		_createHeaderRowCell: function (cellElement, column) {
			var contentNode = column.headerNode = cellElement;
			var field = column.field;
			if (field) {
				cellElement.field = field;
			}
			// allow for custom header content manipulation
			if (column.renderHeaderCell) {
				appendIfNode(contentNode, column.renderHeaderCell(contentNode));
			}
			else if ('label' in column || column.field) {
				contentNode.appendChild(document.createTextNode(
					'label' in column ? column.label : column.field));
			}
			if (column.sortable !== false && field && field !== '_item') {
				cellElement.sortable = true;
				cellElement.className += ' dgrid-sortable';
			}
		},

		left: function (cell, steps) {
			if (!cell.element) {
				cell = this.cell(cell);
			}
			return this.cell(this._move(cell, -(steps || 1), 'dgrid-cell'));
		},
		right: function (cell, steps) {
			if (!cell.element) {
				cell = this.cell(cell);
			}
			return this.cell(this._move(cell, steps || 1, 'dgrid-cell'));
		},

		_defaultRenderCell: function (object, value, td) {
			// summary:
			//		Default renderCell implementation.
			//		NOTE: Called in context of column definition object.
			// object: Object
			//		The data item for the row currently being rendered
			// value: Mixed
			//		The value of the field applicable to the current cell
			// td: DOMNode
			//		The cell element representing the current item/field
			// options: Object?
			//		Any additional options passed through from renderRow

			if (this.formatter) {
				// Support formatter, with or without formatterScope
				var formatter = this.formatter,
					formatterScope = this.grid.formatterScope;
				td.innerHTML = typeof formatter === 'string' && formatterScope ?
					formatterScope[formatter](value, object) : this.formatter(value, object);
			}
			else if (value != null) {
				td.appendChild(document.createTextNode(value));
			}
		},

		renderRow: function (item, options) {
			var row = this.createRowCells('td', lang.hitch(this, '_createBodyRowCell'),
				options && options.subRows, item, options);

			// row gets a wrapper div for a couple reasons:
			// 1. So that one can set a fixed height on rows (heights can't be set on <table>'s AFAICT)
			// 2. So that outline style can be set on a row when it is focused,
			// and Safari's outline style is broken on <table>
			var div = domConstruct.create('div', { role: 'row' });
			div.appendChild(row);
			return div;
		},

		renderHeader: function () {
			// summary:
			//		Setup the headers for the grid
			var grid = this,
				headerNode = this.headerNode;

			headerNode.setAttribute('role', 'row');

			// clear out existing header in case we're resetting
			domConstruct.empty(headerNode);

			var row = this.createRowCells('th', lang.hitch(this, '_createHeaderRowCell'),
				this.subRows && this.subRows.headerRows);
			this._rowIdToObject[row.id = this.id + '-header'] = this.columns;
			headerNode.appendChild(row);

			// If the columns are sortable, re-sort on clicks.
			// Use a separate listener property to be managed by renderHeader in case
			// of subsequent calls.
			if (this._sortListener) {
				this._sortListener.remove();
			}
			this._sortListener = listen(row, 'click,keydown', function (event) {
				// respond to click, space keypress, or enter keypress
				if (event.type === 'click' || event.keyCode === 32 ||
						(!has('opera') && event.keyCode === 13)) {
					var target = event.target;
					var field;
					var sort;
					var newSort;
					var eventObj;

					do {
						if (target.sortable) {
							field = target.field || target.columnId;
							sort = grid.sort[0];
							if (!grid.hasNeutralSort || !sort || sort.property !== field || !sort.descending) {
								// If the user toggled the same column as the active sort,
								// reverse sort direction
								newSort = [{
									property: field,
									descending: sort && sort.property === field &&
										!sort.descending
								}];
							}
							else {
								// If the grid allows neutral sort and user toggled an already-descending column,
								// clear sort entirely
								newSort = [];
							}

							// Emit an event with the new sort
							eventObj = {
								bubbles: true,
								cancelable: true,
								grid: grid,
								parentType: event.type,
								sort: newSort
							};

							if (listen.emit(event.target, 'dgrid-sort', eventObj)) {
								// Stash node subject to DOM manipulations,
								// to be referenced then removed by sort()
								grid._sortNode = target;
								grid.set('sort', newSort);
							}

							break;
						}
					} while ((target = target.parentNode) && target !== headerNode);
				}
			});
		},

		resize: function () {
			// extension of List.resize to allow accounting for
			// column sizes larger than actual grid area
			var headerTableNode = this.headerNode.firstChild,
				contentNode = this.contentNode,
				width;

			this.inherited(arguments);

			// Force contentNode width to match up with header width.
			contentNode.style.width = ''; // reset first
			if (contentNode && headerTableNode) {
				if ((width = headerTableNode.offsetWidth) > contentNode.offsetWidth) {
					// update size of content node if necessary (to match size of rows)
					// (if headerTableNode can't be found, there isn't much we can do)
					contentNode.style.width = width + 'px';
				}
			}
		},

		destroy: function () {
			// Run _destroyColumns first to perform any column plugin tear-down logic.
			this._destroyColumns();
			if (this._sortListener) {
				this._sortListener.remove();
			}

			this.inherited(arguments);
		},

		_setSort: function () {
			// summary:
			//		Extension of List.js sort to update sort arrow in UI

			// Normalize sort first via inherited logic, then update the sort arrow
			this.inherited(arguments);
			this.updateSortArrow(this.sort);
		},

		_findSortArrowParent: function (field) {
			// summary:
			//		Method responsible for finding cell that sort arrow should be
			//		added under.  Called by updateSortArrow; separated for extensibility.

			var columns = this.columns;
			for (var i in columns) {
				var column = columns[i];
				if (column.field === field) {
					return column.headerNode;
				}
			}
		},

		updateSortArrow: function (sort, updateSort) {
			// summary:
			//		Method responsible for updating the placement of the arrow in the
			//		appropriate header cell.  Typically this should not be called (call
			//		set("sort", ...) when actually updating sort programmatically), but
			//		this method may be used by code which is customizing sort (e.g.
			//		by reacting to the dgrid-sort event, canceling it, then
			//		performing logic and calling this manually).
			// sort: Array
			//		Standard sort parameter - array of object(s) containing property name
			//		and optional descending flag
			// updateSort: Boolean?
			//		If true, will update this.sort based on the passed sort array
			//		(i.e. to keep it in sync when custom logic is otherwise preventing
			//		it from being updated); defaults to false

			// Clean up UI from any previous sort
			if (this._lastSortedArrow) {
				// Remove the sort classes from the parent node
				domClass.remove(this._lastSortedArrow.parentNode, 'dgrid-sort-up dgrid-sort-down');
				// Destroy the lastSortedArrow node
				domConstruct.destroy(this._lastSortedArrow);
				delete this._lastSortedArrow;
			}

			if (updateSort) {
				this.sort = sort;
			}
			if (!sort[0]) {
				return; // Nothing to do if no sort is specified
			}

			var prop = sort[0].property,
				desc = sort[0].descending,
				// if invoked from header click, target is stashed in _sortNode
				target = this._sortNode || this._findSortArrowParent(prop),
				arrowNode;

			delete this._sortNode;

			// Skip this logic if field being sorted isn't actually displayed
			if (target) {
				target = target.contents || target;
				// Place sort arrow under clicked node, and add up/down sort class
				arrowNode = this._lastSortedArrow = domConstruct.create('div', {
					className: 'dgrid-sort-arrow ui-icon',
					innerHTML: '&nbsp;',
					role: 'presentation'
				}, target, 'first');
				domClass.add(target, 'dgrid-sort-' + (desc ? 'down' : 'up'));
				// Call resize in case relocation of sort arrow caused any height changes
				this.resize();
			}
		},

		styleColumn: function (colId, css) {
			// summary:
			//		Dynamically creates a stylesheet rule to alter a column's style.

			return this.addCssRule('#' + miscUtil.escapeCssIdentifier(this.domNode.id) +
				' .dgrid-column-' + replaceInvalidChars(colId), css);
		},

		/*=====
		_configColumn: function (column, rowColumns, prefix) {
			// summary:
			//		Method called when normalizing base configuration of a single
			//		column.  Can be used as an extension point for behavior requiring
			//		access to columns when a new configuration is applied.
		},=====*/

		_configColumns: function (prefix, rowColumns) {
			// configure the current column
			var subRow = [],
				isArray = rowColumns instanceof Array;

			function configColumn(column, columnId) {
				if (typeof column === 'string') {
					rowColumns[columnId] = column = { label: column };
				}
				if (!isArray && !column.field) {
					column.field = columnId;
				}
				columnId = column.id = column.id || (isNaN(columnId) ? columnId : (prefix + columnId));
				// allow further base configuration in subclasses
				if (this._configColumn) {
					this._configColumn(column, rowColumns, prefix);
					// Allow the subclasses to modify the column id.
					columnId = column.id;
				}
				if (isArray) {
					this.columns[columnId] = column;
				}

				// add grid reference to each column object for potential use by plugins
				column.grid = this;
				subRow.push(column); // make sure it can be iterated on
			}

			miscUtil.each(rowColumns, configColumn, this);
			return isArray ? rowColumns : subRow;
		},

		_destroyColumns: function () {
			// summary:
			//		Extension point for column-related cleanup.  This is called
			//		immediately before configuring a new column structure,
			//		and when the grid is destroyed.

			// First remove rows (since they'll be refreshed after we're done),
			// so that anything temporarily extending removeRow can run.
			// (cleanup will end up running again, but with nothing to iterate.)
			this.cleanup();
		},

		configStructure: function () {
			// configure the columns and subRows
			var subRows = this.subRows,
				columns = this._columns = this.columns;

			// Reset this.columns unless it was already passed in as an object
			this.columns = !columns || columns instanceof Array ? {} : columns;

			if (subRows) {
				// Process subrows, which will in turn populate the this.columns object
				for (var i = 0; i < subRows.length; i++) {
					subRows[i] = this._configColumns(i + '-', subRows[i]);
				}
			}
			else {
				this.subRows = [this._configColumns('', columns)];
			}
		},

		_getColumns: function () {
			// _columns preserves what was passed to set("columns"), but if subRows
			// was set instead, columns contains the "object-ified" version, which
			// was always accessible in the past, so maintain that accessibility going
			// forward.
			return this._columns || this.columns;
		},
		_setColumns: function (columns) {
			this._destroyColumns();
			// reset instance variables
			this.subRows = null;
			this.columns = columns;
			// re-run logic
			this._updateColumns();
		},

		_setSubRows: function (subrows) {
			this._destroyColumns();
			this.subRows = subrows;
			this._updateColumns();
		},

		_updateColumns: function () {
			// summary:
			//		Called when columns, subRows, or columnSets are reset

			this.configStructure();
			this.renderHeader();

			this.refresh();
			// re-render last collection if present
			this._lastCollection && this.renderArray(this._lastCollection);

			// After re-rendering the header, re-apply the sort arrow if needed.
			if (this._started) {
				if (this.sort.length) {
					this._lastSortedArrow = null;
					this.updateSortArrow(this.sort);
				} else {
					// Only call resize directly if we didn't call updateSortArrow,
					// since that calls resize itself when it updates.
					this.resize();
				}
			}
		}
	});

	Grid.appendIfNode = appendIfNode;

	return Grid;
});
