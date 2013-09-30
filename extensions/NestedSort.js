define(["dojo/_base/declare", "dojo/_base/lang"],
function(declare, lang){
/*
 *	Nested Sort plugin for dgrid
 *
 *	A plugin that allows your grid to have multi-column sorts, thus giving users
 *	the experience of stable sorting. The behaviors are:
 *
 *	1. Clicking on a header that's already at the start of the sort list:
 *		Toggles 'descending' for that column.
 *	2. Clicking on a header that's not in the sort list:
 *		Add it to the start of the sort list, ascending.
 *	3. Clicking on a header that's down in the sort list:
 *		Move it to the front of the list without changing 'descending'.
 *
 */
	
	return declare(null, {
		// sortDepthLimit: Integer
		//		The maximum nested sort depth. The default of 'null' means 'no limit'.
		sortDepthLimit: null,
		
		_constructSort: function (columnHeader) {
			// summary:
			//		Construct a new sort array based on the given column header node.
			//		Instead of always creating an array of one element like Grid.js,
			//		this implementation maintains a stable sort with multiple elements.

			var sort = lang.clone(this.get('sort') || []);
			var field = columnHeader.field || columnHeader.columnId;
			for (var i = 0; i < sort.length; i++) {
				var col = sort[i];
				if (col.attribute === field) {
					if (i === 0) {
						// If the old one was already at the top, toggle descending.
						col.descending = !col.descending;
					} else {
						sort.splice(i, 1); // remove from middle
						sort.splice(0, 0, col); // add to the start
					}
					break;
				}
			}
			if (i >= sort.length) {
				sort.splice(0, 0, { attribute: field, descending: false });
			}
			if (this.sortDepthLimit && sort.length > this.sortDepthLimit) {
				sort.splice(this.sortDepthLimit);
			}
			return sort;
		}
	});
});
