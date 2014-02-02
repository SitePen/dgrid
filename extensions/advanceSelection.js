define(["dojo/_base/declare", "dojo/html", "dojo/has", "dojo/dom-construct", "dijit/form/Button", "put-selector/put", "dojo/on"], function(
	declare, html, has, domConstruct, Button, put, on) {
	/*
	 *	Advance Row Selection plugin for dgrid
	 *	Originally contributed by RCorp(Ramanan Corporation, India) 2013-11-27
	 *
	 *  Just add plugin and use
	 */

	var invalidClassChars = /[^\._a-zA-Z0-9-]/g;
	var contentBoxSizing = has("ie") < 8 && !has("quirks");
	return declare(null, {
		constructor: function() {

		},
		/**
		 * override the Grid's renderHeader function
		 */
		renderHeader: function() {
			this.inherited(arguments);
			headerNode = this.headerNode

			var row = this.createButtonRowCells("th", function(th, column) {
				var contentNode = column.headerNode = th;
				if (contentBoxSizing) {
					// we're interested in the th, but we're passed the inner div
					th = th.parentNode;
				}
				var field = column.field;
				if (field) {
					th.field = field;
				}
				// allow for custom header content manipulation
				if (column.renderHeaderCell) {
					// appendIfNode(contentNode, column.renderHeaderCell(contentNode));
				} else if (column.label || column.field) {
					contentNode.appendChild(document.createTextNode(column.label || column.field));
				}
				if (column.sortable !== false && field && field != "_item") {
					th.sortable = true;
					th.className += " dgrid-sortable";
				}
			}, this.subRows && this.subRows.headerRows);

			row.id = this.id + "-header-filterable";
			this._rowIdToObject[row.id = this.id + "-header-filterable"] = this.columns;
			headerNode.appendChild(row);
			var trTag = ''
			if ((has("ie") < 9 || has("quirks"))) {
				// because of tBody Tag get chldren of children
				trTag = row.children[0].children[0]
			} else {
				trTag = row.children[0];
			}
			// trTag represents the row - containing 3 cells

			// first Cell
			this.addSelectAllButton(trTag.children[0]);
			// second Cell
			this.addSelectNoneButton(trTag.children[1]);
			// third Cell
			this.addSelectInverseButton(trTag.children[2]);
			// place row on top of the hedader-node
			domConstruct.place(row, headerNode, 0);
		},
		createButtonRowCells: function(tag, each, subRows) {
			// summary:
			//		Generates the new header row for the placement of Buttons
			//		for selection
			var columns = this.columns,
				headerNode = this.headerNode,
				i = headerNode.childNodes.length;

			headerNode.setAttribute("role", "row");
			// summary:
			//		Generates the grid for each row (used by renderHeader and and renderRow)
			var row = put("table.dgrid-row-table[role=presentation]"),
				cellNavigation = this.cellNavigation,
				// IE < 9 needs an explicit tbody; other browsers do not
				tbody = (has("ie") < 9 || has("quirks")) ? put(row, "tbody") : row,
				tr, si, sl, i, l, // iterators
				subRow, column, id, extraClassName, cell, innerCell, colSpan, rowSpan; // used inside loops
			// Allow specification of custom/specific subRows, falling back to
			// those defined on the instance.
			subRows = subRows || this.subRows;

			tr = put(tbody, "tr");
			// // add the td to the tr at the end for better performance

			// Create Cell for selecAll
			tr.appendChild(this.addButton(tag, "selectAll"));
			// Create Cell for selecNone
			tr.appendChild(this.addButton(tag, "selectNone"));
			// Create Cell for selecInverse
			tr.appendChild(this.addButton(tag, "selectInverse"));
			return row;
		},
		addButton: function(tag, id) {
			// summary:
			//		Create cell for button placement
			var cell = put(tag + (".dgrid-cell.dgrid-cell-padding" + (id ? ".dgrid-column-" + id : "")).replace(invalidClassChars, "-") + "[role=" + (tag === "th" ? "columnheader" : "gridcell") + "]");
			// diffrent id string for buttons cells
			cell.id = id + '_Button_Cell';
			if (contentBoxSizing) {
				// The browser (IE7-) does not support box-sizing: border-box, so we emulate it with a padding div
				innerCell = put(cell, "!dgrid-cell-padding div.dgrid-cell-padding"); // remove the dgrid-cell-padding, and create a child with that class
				cell.contents = innerCell;
			} else {
				innerCell = cell;
			}
			return cell;
		},
		addSelectAllButton: function(parentDiv) {
			var _this = this;
			/**
			 * Button widget to select All rows
			 * @type {Button}
			 */
			var selectAll = new Button({
				label: "Select All",
			});
			selectAll.on('click', function(evt) {
				_this.selectAll();
			})
			parentDiv.appendChild(selectAll.domNode)
		},
		addSelectNoneButton: function(parentDiv) {
			var _this = this;
			/**
			 * Button widget to deselect All rows
			 * @type {Button}
			 */
			var selectNone = new Button({
				label: "Select None",
			});
			selectNone.on('click', function(evt) {
				_this.clearSelection();
			})
			parentDiv.appendChild(selectNone.domNode)
		},
		addSelectInverseButton: function(parentDiv) {
			var _this = this;
			/**
			 * Button widget to toggle selection of rows
			 * @type {Button}
			 */
			var selectInverse = new Button({
				label: "Select Inverse",
			});
			selectInverse.on('click', function() {
				if (_this.allSelected) {
					_this.clearSelection();
				} else {
					for (var i in _this._rowIdToObject) {
						if (_this.isSelected(_this._rowIdToObject[i])) {
							_this.select(_this._rowIdToObject[i], null, false)
						} else {
							_this.select(_this._rowIdToObject[i], null, true)
						}
					}
				}
				if (_this._fireSelectionEvents) {
					_this._fireSelectionEvents();
				}
			})
			parentDiv.appendChild(selectInverse.domNode)
		}
	});
});