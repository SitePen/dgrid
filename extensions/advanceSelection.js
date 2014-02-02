define(["dojo/_base/declare", "dojo/html", "dojo/has", "dojo/dom-construct", "dijit/form/Button", "put-selector/put", "dojo/on"], function(
	declare, html, has, domConstruct, Button, put, on) {
	/*
	 *	Advance Row Selection plugin for dgrid
	 *	Originally contributed by RCorp(Ramanan Corporation, India) 2013-11-27
	 *
	 */

	var invalidClassChars = /[^\._a-zA-Z0-9-]/g;
	var contentBoxSizing = has("ie") < 8 && !has("quirks");
	return declare(null, {
		constructor: function() {
			// selectAllButton: widget Button
			//		Button widget to select All
			this.selectAllButton = '';

			// hiderMenuNode: widget Button
			//		Button widget to de-select All.
			this.selectNoneButton = '';

			// hiderMenuNode: widget Button
			//		Button widget to inverse selection.
			this.selectInverseButton = '';

			// seletorNode: DOMNode
			//		The node for the placement of selection Buttons.
			this.selectorNode = '';
		},
		renderHeader: function() {
			// summary:
			// override the Grid's renderHeader function
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
				// because of tBody Tag, get children of children
				trTag = row.children[0].children[0]
			} else {
				trTag = row.children[0];
			}
			this.selectorNode = trTag;
			
			// first Cell
			this._createSelectAllButton();
			// second Cell
			this._createSelectNoneButton();
			// third Cell
			this._createSelectInverseButton();
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
			tr.appendChild(this._addButton(tag, "selectAll"));
			// Create Cell for selecNone
			tr.appendChild(this._addButton(tag, "selectNone"));
			// Create Cell for selecInverse
			tr.appendChild(this._addButton(tag, "selectInverse"));
			return row;
		},
		_addButton: function(tag, id) {
			// summary:
			// 		Create cells for Selector Buttons
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
		addSelectionButtons: function(button, index) {
			// summary:
			//		Set Button Position
			// index: integer
			//		position of the button in selectorNode
			// button: selector button widget
			this.selectorNode.children[index].appendChild(button.domNode)
		},
		addAllSelectionButtons: function(posSelectAll, posSelectNone, posSelectInverse) {
			// summary:
			//		set position of  all selector buttons
			// posSelectAll: integer
			//		position of the Select All button in selectorNode
			// posSelectNone: integer
			//		position of the Select None button in selectorNode
			// posSelectInverse: integer
			//		position of the Select Inverse button in selectorNode
			// 
			this.selectorNode.children[posSelectAll].appendChild(this.selectAllButton.domNode, posSelectAll)
			this.selectorNode.children[posSelectNone].appendChild(this.selectNoneButton.domNode, posSelectNone)
			this.selectorNode.children[posSelectInverse].appendChild(this.selectInverseButton.domNode, posSelectInverse)
		},
		_createSelectAllButton: function() {
			// summary:
			//		Button widget to select All rows
			var _this = this;
			this.selectAllButton = new Button({
				label: "Select All",
			});
			this.selectAllButton.on('click', function(evt) {
				_this.selectAll();
			})
			// by default Place Select all at first cell
			this.addSelectionButtons(this.selectAllButton, 0)
		},
		_createSelectNoneButton: function() {
			// summary:
			//		Button widget to de-select All rows
			var _this = this;
			this.selectNoneButton = new Button({
				label: "Select None",
			});
			this.selectNoneButton.on('click', function(evt) {
				_this.clearSelection();
			})
			// by default Place Select None at second cell
			this.addSelectionButtons(this.selectNoneButton, 1)
		},
		_createSelectInverseButton: function() {
			// summary:
			//		Button widget to toggle selection of rows
			var _this = this;
			this.selectInverseButton = new Button({
				label: "Select Inverse",
			});
			this.selectInverseButton.on('click', function() {
				if (_this.allSelected) {
					_this.clearSelection();
				} else {
					for (var i in _this._rowIdToObject) {
						_this.select(_this._rowIdToObject[i], null, null)
					}
				}
				if (_this._fireSelectionEvents) {
					_this._fireSelectionEvents();
				}
			})
			// by default Place Select Inverse at third cell
			this.addSelectionButtons(this.selectInverseButton, 2)
		}
	});
});