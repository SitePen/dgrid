define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"../util/misc",
	"xstyle/css!../css/extensions/CompoundColumns.css"
], function(lang, declare, miscUtil){
	return declare(null, {
		// summary:
		//		Extension allowing for specification of columns with additional
		//		header rows spanning multiple columns for strictly display purposes.
		//		Only works on `columns` arrays, not `columns` objects or `subRows`
		//		(nor ColumnSets).
		// description:
		//		CompoundColumns allows nested header cell configurations, wherein the
		//		higher-level headers may span multiple columns and are for
		//		display purposes only.
		//		These nested header cells are configured using a special recursive
		//		`children` property in the column definition, where only the deepest
		//		children are ultimately rendered in the grid as actual columns.
		//		In addition, the deepest child columns may be rendered without
		//		individual headers by specifying `showChildHeaders: false` on the parent.
		
		configStructure: function(){
			// create a set of sub rows for the header row so we can do compound columns
			// the first row is a special spacer row
			var columns = (this.subRows && this.subRows[0]) || this.columns,
				headerRows = [[]],
				topHeaderRow = headerRows[0],
				contentColumns = [];
			// This first row is spacer row that will be made invisible (zero height)
			// with CSS, but it must be rendered as the first row since that is what
			// the table layout is driven by.
			headerRows[0].className = "dgrid-spacer-row";
			
			function processColumns(columns, level, hasLabel, parent){
				var numColumns = 0,
					noop = function(){},
					column, children, hasChildLabels,
					isArray = columns instanceof Array;
				
				function processColumn(column, i){
					// Handle the column config when it is an object rather
					// than an array.
					if(typeof column === "string"){
						column = {label: column};
					}
					if(!isArray && !column.field){
						column.field = i;
					}
					children = column.children;
					hasChildLabels = column.children && (column.showChildHeaders !== false);
					// Set a reference to the parent column so later the children's ids can
					// be updated to indicate the parent-child relationship.
					column.parentColumn = parent;
					if(children){
						// it has children
						// make sure the column has an id
						if(column.id == null){
							column.id = ((parent && parent.id) || level-1) + "-" + topHeaderRow.length;
						}else if (parent && parent.id){
							// Make sure nested compound columns have ids that are prefixed with
							// their parent's ids.
							column.id = parent.id + "-" + column.id;
						}
						// recursively process the children
						numColumns += (column.colSpan = processColumns(children, level + 1, hasChildLabels, column));
					}else{
						// it has no children, it is a normal header, add it to the content columns
						contentColumns.push(column);
						// add each one to the first spacer header row for proper layout of the header cells
						topHeaderRow.push(lang.delegate(column, {renderHeaderCell: noop}));
						numColumns++;
					}
					if(!hasChildLabels){
						// create a header version of the column where we can define a specific rowSpan
						// we define the rowSpan as a negative, the number of levels less than the total number of rows, which we don't know yet
						column = lang.delegate(column, {rowSpan: -level});
					}
					// add the column to the header rows at the appropriate level
					if(hasLabel){
						(headerRows[level] || (headerRows[level] = [])).push(column);
					}
				}
				miscUtil.each(columns, processColumn, this);
				return numColumns;
			}
			processColumns(columns, 1, true);
			
			var numHeaderRows = headerRows.length,
				i, j, headerRow, headerColumn;
			// Now go back through and increase the rowSpans of the headers to be
			// total rows minus the number of levels they are at.
			for(i = 0; i < numHeaderRows; i++){
				headerRow = headerRows[i];
				for(j = 0; j < headerRow.length; j++){
					headerColumn = headerRow[j];
					if(headerColumn.rowSpan < 1){
						headerColumn.rowSpan += numHeaderRows;
					}
				}
			}
			// we need to set this to be used for subRows, so we make it a single row
			contentColumns = [contentColumns];
			// set our header rows so that the grid will use the alternate header row 
			// configuration for rendering the headers
			contentColumns.headerRows = headerRows;  
			this.subRows = contentColumns;
			this.inherited(arguments);
		},

		_configColumn: function(column, columnId, rowColumns, prefix){
			// Updates the id on a column definition that is a child to include
			// the parent's id.
			var parent = column.parentColumn;
			if(parent){
				// Adjust the id to incorporate the parent's id.
				// Remove the prefix if it was used to create the id
				var id = columnId.indexOf(prefix) === 0 ? columnId.substring(prefix.length) : columnId;
				prefix = parent.id + "-";
				columnId = column.id = prefix + id;
			}
			this.inherited(arguments, [column, columnId, rowColumns, prefix]);
		},

		cell: function(target, columnId){
			// summary:
			//		Get the cell object by node, or event, id, plus a columnId.  This extension,
			//		prefixes children's column ids with the parents' column ids.  Take that into account
			//		when looking for a column id.

			// Try the super's cell function to see if it can find a match.
			var result = this.inherited(arguments);
			if(!result.element && typeof columnId != "undefined"){
				// Find a column id that ends with the provided column id.  This will locate a child column
				// by an id that was provided in the original column configuration.  For example, if a compound column
				// was given the id "compound" and a child column was given the id "child", this will find the column
				// using only "child".  If "compound-child" was being searched for, the call to the super
				// above would have found the cell.
				var suffix = "-" + columnId;
				var suffixLength = suffix.length;
				for(var completeId in this.columns){
					if(completeId.indexOf(suffix, completeId.length - suffixLength) !== -1){
						var result2 = this.inherited(arguments, [target, completeId]);
						return result2.element && result2 || result;
					}
				}
			}
			return result;
		}
	});
});
