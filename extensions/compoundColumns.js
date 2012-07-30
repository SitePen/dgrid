define(["dojo/_base/lang", "put-selector/put"], 
	function(lang, put){
		return function(columns){
			// create a set of sub rows for the header row so we can do compound columns
			// the first row is a special spacer row
			var headerRows = [[]];
			// this first row is spacer row that will be made invisible (zero height) with CSS, 
			// but the must be rendered as the first row since that is what the table layout is driven by
			headerRows[0].className = "dgrid-spacer-row";
			var contentColumns = [];
			function processColumns(columns, level, hasLabel){
				var numColumns = 0;
				for(var i in columns){
					var column = columns[i];
					var children = column.children;
					var hasChildLabels = false;
					if(children){
						// it has children, let's check to see if this is a no-label situation
						for(var j = 0; j < children.length; j++){
							var child = children[j];
							if(child.label || child.renderHeaderCell){
								hasChildLabels = true;
							}
						}
						// it has children, recursively process the children
						numColumns += (column.colSpan = processColumns(children, level + 1, hasChildLabels));
					}else{
						// it has no children, it is a normal header, add it to the content columns
						contentColumns.push(column);
						// add each one to the first spacer header row for proper layout of the header cells 
						headerRows[0].push(lang.delegate(column, {renderHeaderCell: function(){}}));						
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
				return numColumns;
			}
			processColumns(columns, 1, true);
			var numHeaderRows = headerRows.length;
			// now go back through and increase the rowSpans of the headers to be total rows minus the number of levels they are at
			for(var i = 0; i < numHeaderRows; i++){
				var headerRow = headerRows[i];
				for(var j = 0; j < headerRow.length; j++){
					var headerColumn = headerRow[j];
					if(headerColumn.rowSpan < 1){
						headerColumn.rowSpan += numHeaderRows;
					} 
				}
			}
			// we need to set this to be used for subRows, so we make it a single row
			contentColumns = [contentColumns]; //  
			// set our header rows so that the grid will use the alternate header row 
			// configuration for rendering the headers
			contentColumns.headerRows = headerRows;  
			return contentColumns;
		};
});
