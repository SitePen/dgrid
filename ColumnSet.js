define(["dojo/_base/kernel", "dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "dojo/aspect", "dojo/query", "dojo/has", "./util/misc", "put-selector/put", "xstyle/has-class", "./Grid", "dojo/_base/sniff", "xstyle/css!./css/columnset.css"],
function(kernel, declare, lang, Deferred, listen, aspect, query, has, miscUtil, put, hasClass, Grid){
	has.add("event-mousewheel", function(global, document, element){
		return 'onmousewheel' in element;
	});
	has.add("event-wheel", function(global, document, element){
		return 'onwheel' in element;
	});

	var colsetidAttr = "data-dgrid-column-set-id";
	
	hasClass("safari", "ie-7");
	
	function adjustScrollLeft(grid, row){
		var scrollLefts = grid._columnSetScrollLefts;
		function doAdjustScrollLeft(){
			query(".dgrid-column-set", row).forEach(function(element){
				element.scrollLeft = scrollLefts[element.getAttribute(colsetidAttr)];
			});
		}
		if(has("ie") < 8 || has("quirks")){
			setTimeout(doAdjustScrollLeft, 1);
		}else{
			doAdjustScrollLeft();
		}
	}
	
	function getColumnSetSubRows(subRows, columnSetId){
		// Builds a subRow collection that only contains columns that correspond to
		// a given column set id.
		if(!subRows || !subRows.length){
			return;
		}
		var subset = [];
		var idPrefix = columnSetId + "-";
		for(var i = 0, numRows = subRows.length; i < numRows; i++){
			var row = subRows[i];
			var subsetRow = [];
			subsetRow.className = row.className;
			for(var k = 0, numCols = row.length; k < numCols; k++){
				var column = row[k];
				// The column id begins with the column set id.
				if(column.id != null && column.id.indexOf(idPrefix) === 0){
					subsetRow.push(column);
				}
			}
			subset.push(subsetRow);
		}
		return subset;
	}

	var horizMouseWheel = has("event-mousewheel") || has("event-wheel") ? function(grid){
		return function(target, listener){
			return listen(target, has("event-mousewheel") ? "mousewheel" : "wheel", function(event){
				var node = event.target, deltaX;
				// WebKit will invoke mousewheel handlers with an event target of a text
				// node; check target and if it's not an element node, start one node higher
				// in the tree
				if(node.nodeType !== 1){
					node = node.parentNode;
				}
				while(!query.matches(node, ".dgrid-column-set[" + colsetidAttr + "]", target)){
					if(node === target || !(node = node.parentNode)){
						return;
					}
				}
				
				// Normalize reported delta value:
				// wheelDeltaX (webkit, mousewheel) needs to be negated and divided by 3
				// deltaX (FF17+, wheel) can be used exactly as-is
				deltaX = event.deltaX || -event.wheelDeltaX / 3;
				if(deltaX){
					// only respond to horizontal movement
					listener.call(null, grid, node, deltaX);
				}
			});
		};
	} : function(grid){
		return function(target, listener){
			return listen(target, ".dgrid-column-set[" + colsetidAttr + "]:MozMousePixelScroll", function(event){
				if(event.axis === 1){
					// only respond to horizontal movement
					listener.call(null, grid, this, event.detail);
				}
			});
		};
	};
	
	return declare(null, {
		// summary:
		//		Provides column sets to isolate horizontal scroll of sets of 
		//		columns from each other. This mainly serves the purpose of allowing for
		//		column locking.
		
		postCreate: function(){
			var self = this;
			this.inherited(arguments);
			
			this.on(horizMouseWheel(this), function(grid, colsetNode, amount){
				var id = colsetNode.getAttribute(colsetidAttr),
					scroller = grid._columnSetScrollers[id],
					scrollLeft = scroller.scrollLeft + amount;
				
				scroller.scrollLeft = scrollLeft < 0 ? 0 : scrollLeft;
			});
			this.on('.dgrid-column-set:dgrid-cellfocusin', function (event) {
				self._onColumnSetCellFocus(event, this);
			});
		},
		columnSets: [],
		createRowCells: function(tag, each, subRows, object){
			var row = put("table.dgrid-row-table");
			var tr = put(row, "tbody tr");
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				// iterate through the columnSets
				var cell = put(tr, tag + ".dgrid-column-set-cell.dgrid-column-set-" + i +
					" div.dgrid-column-set[" + colsetidAttr + "=" + i + "]");
				var subset = getColumnSetSubRows(subRows || this.subRows , i) || this.columnSets[i];
				cell.appendChild(this.inherited(arguments, [tag, each, subset, object]));
			}
			return row;
		},
		renderArray: function(){
			var grid = this,
				rows = this.inherited(arguments);

			Deferred.when(rows, function(rows){
				for(var i = 0; i < rows.length; i++){
					adjustScrollLeft(grid, rows[i]);
				}
			});
			return rows;
		},
		insertRow: function(){
			var row = this.inherited(arguments);
			adjustScrollLeft(this, row);
			return row;
		},
		
		renderHeader: function(){
			// summary:
			//		Setup the headers for the grid
			this.inherited(arguments);
			
			var columnSets = this.columnSets,
				domNode = this.domNode,
				scrollers = this._columnSetScrollers,
				scrollerContents = this._columnSetScrollerContents = {},
				scrollLefts = this._columnSetScrollLefts = {},
				grid = this,
				i, l;
			
			function reposition(){
				grid._positionScrollers();
			}
			
			if (scrollers) {
				// this isn't the first time; destroy existing scroller nodes first
				for(i in scrollers){
					put(scrollers[i], "!");
				}
			} else {
				// first-time-only operations: hook up event/aspected handlers
				aspect.after(this, "resize", reposition, true);
				aspect.after(this, "styleColumn", reposition, true);
				this._columnSetScrollerNode = put(this.footerNode, "+div.dgrid-column-set-scroller-container");
			}
			
			// reset to new object to be populated in loop below
			scrollers = this._columnSetScrollers = {};
			
			for(i = 0, l = columnSets.length; i < l; i++){
				this._putScroller(columnSets[i], i);
			}
			
			this._positionScrollers();
		},
		
		styleColumnSet: function(colsetId, css){
			// summary:
			//		Dynamically creates a stylesheet rule to alter a columnset's style.
			
			var rule = this.addCssRule("#" + miscUtil.escapeCssIdentifier(this.domNode.id) +
				" .dgrid-column-set-" + miscUtil.escapeCssIdentifier(colsetId, "-"), css);
			this._positionScrollers();
			return rule;
		},
		
		_destroyColumns: function(){
			var columnSetsLength = this.columnSets.length,
				i, j, k, subRowsLength, len, columnSet, subRow, column;
			for(i = 0; i < columnSetsLength; i++){
				columnSet = this.columnSets[i];
				for(j = 0, subRowsLength = columnSet.length; j < subRowsLength; j++){
					subRow = columnSet[j];
					for(k = 0, len = subRow.length; k < len; k++){
						column = subRow[k];
						if(typeof column.destroy === "function"){ column.destroy(); }
					}
				}
			}
			this.inherited(arguments);
		},

		configStructure: function(){
			// Squash the column sets together so the grid and other dgrid extensions and mixins can
			// configure the columns and create any needed subrows.
			this.columns = {};
			this.subRows = [];
			for(var i = 0, l = this.columnSets.length; i < l; i++){
				var columnSet = this.columnSets[i];
				for(var j = 0; j < columnSet.length; j++){
					columnSet[j] = this._configColumns(i + "-" + j + "-", columnSet[j]);
				}
			}
			this.inherited(arguments);
		},

		_positionScrollers: function (){
			var domNode = this.domNode,
				scrollers = this._columnSetScrollers,
				scrollerContents = this._columnSetScrollerContents,
				columnSets = this.columnSets,
				scrollerWidth = 0,
				numScrollers = 0, // tracks number of visible scrollers (sets w/ overflow)
				i, l, columnSetElement, contentWidth;
			
			for(i = 0, l = columnSets.length; i < l; i++){
				// iterate through the columnSets
				columnSetElement = query('.dgrid-column-set[' + colsetidAttr + '="' + i +'"]', domNode)[0];
				scrollerWidth = columnSetElement.offsetWidth;
				contentWidth = columnSetElement.firstChild.offsetWidth;
				scrollerContents[i].style.width = contentWidth + "px";
				scrollers[i].style.width = scrollerWidth + "px";
				
				if(has("ie") < 9){
					// IE seems to need scroll to be set explicitly
					scrollers[i].style.overflowX = contentWidth > scrollerWidth ? "scroll" : "auto";
				}
				
				// Keep track of how many scrollbars we're showing
				if(contentWidth > scrollerWidth){ numScrollers++; }
			}
			
			this._columnSetScrollerNode.style.bottom = this.showFooter ? this.footerNode.offsetHeight + "px" : "0";
			
			// Align bottom of body node depending on whether there are scrollbars
			this.bodyNode.style.bottom = numScrollers ?
				(has("dom-scrollbar-height") + (has("ie") ? 1 : 0) + "px") :
				"0";
		},

		_putScroller: function (columnSet, i){
			// function called for each columnSet
			var scroller = this._columnSetScrollers[i] =
				put(this._columnSetScrollerNode, "span" +
					// IE8 and old FF need dgrid-scrollbar-height class for scrollbar to be visible,
					// but for some reason IE11's scrollbar arrows become unresponsive, so avoid applying it there
					(has("ie") < 9 || has("ff") ? ".dgrid-scrollbar-height" : "") +
					".dgrid-column-set-scroller.dgrid-column-set-scroller-" + i +
					"[" + colsetidAttr + "=" + i +"]");
			this._columnSetScrollerContents[i] = put(scroller, "div.dgrid-column-set-scroller-content");
			listen(scroller, "scroll", lang.hitch(this, '_onColumnSetScroll'));
		},

		_onColumnSetScroll: function (evt){
			var scrollLeft = evt.target.scrollLeft,
				colSetId = evt.target.getAttribute(colsetidAttr),
				newScrollLeft;

			if(this._columnSetScrollLefts[colSetId] != scrollLeft){
				query('.dgrid-column-set[' + colsetidAttr + '="' + colSetId + '"],.dgrid-column-set-scroller[' + colsetidAttr + '="' + colSetId + '"]', this.domNode).
					forEach(function(element, i){
						element.scrollLeft = scrollLeft;
						if(!i){
							// Compute newScrollLeft based on actual resulting
							// value of scrollLeft, which may be different than
							// what we assigned under certain circumstances
							// (e.g. Chrome under 33% / 67% / 90% zoom).
							// Only need to compute this once, as it will be the
							// same for every row.
							newScrollLeft = element.scrollLeft;
						}
					});
				this._columnSetScrollLefts[colSetId] = newScrollLeft;
			}
		},
		
		_setColumnSets: function(columnSets){
			this._destroyColumns();
			this.columnSets = columnSets;
			this._updateColumns();
		},
		setColumnSets: function(columnSets){
			kernel.deprecated("setColumnSets(...)", 'use set("columnSets", ...) instead', "dgrid 0.4");
			this.set("columnSets", columnSets);
		},
		
		_scrollColumnSet: function(nodeOrId, offsetLeft){
			var id = nodeOrId.tagName ? nodeOrId.getAttribute(colsetidAttr) : nodeOrId;
			var scroller = this._columnSetScrollers[id];
			scroller.scrollLeft = offsetLeft < 0 ? 0 : offsetLeft;
		},
		
		_onColumnSetCellFocus: function(event, columnSetNode){
			var focusedNode = event.target;
			var columnSetId = columnSetNode.getAttribute(colsetidAttr);
			// columnSetNode's offsetLeft is not always correct,
			// so get the columnScroller to check offsetLeft against
			var columnScroller = this._columnSetScrollers[columnSetId];
			var elementEdge = focusedNode.offsetLeft - columnScroller.scrollLeft + focusedNode.offsetWidth;

			if (elementEdge > columnSetNode.offsetWidth ||
				columnScroller.scrollLeft > focusedNode.offsetLeft) {
				this._scrollColumnSet(columnSetNode, focusedNode.offsetLeft);
			}
		}
	});
});
