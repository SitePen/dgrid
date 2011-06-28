define(['dojo', './_Base'], function(dojo, _Base){

return dojox.grid.gridx.core.registerModule(
dojo.declare('dojox.grid.gridx.modules.dnd.Cell', _Base, {
	name: 'dndCell',
	
	required: ['selectCell', 'moveCell', 'body'],

	type: "Cell",

	accept: ["grid/cells"],

	copyWhenRearrange: true,

	canDragIn: false,

	canDragOut: false,

	_load: function(){
		this._selector = this.grid.select.cell;
		this.batchConnect(
			[this.grid.body, 'onChange', '_onBodyChange'],
			[this._selector, 'onSelected', '_onChange'],
			[this._selector, 'onDeselected', '_onChange']
		);
	},

	_onChange: function(){
		if(this._checkShapeHandler){
			clearTimeout(this._checkShapeHandler);
			delete this._checkShapeHandler;
		}
		var _this = this;
		this._checkShapeHandler = setTimeout(function(){
			dojo.when(_this._checkShape(), function(isDndShape){
				_this._isDndShape = isDndShape;
			});
		}, 0);
	},

	_onBodyChange: function(start, count){
		var i, selector = this._selector, model = this.model;
		var hasCellSelected = function(rowIndex, col){
			return selector.isSelected(model.indexToId(i), col.id);
		};
		for(i = start; i < start + count; ++i){
			if(dojo.some(this.grid._columns, dojo.partial(hasCellSelected, i))){
				this._onChange();
				return;
			}
		}
	},

	_checkShape: function(){
		var cellsByCol = this._selector.getSelectedIds(), 
			i, colId, count, rowIds, rowMap, colIndexes = [];
		for(colId in cellsByCol){
			rowIds = cellsByCol[colId];
			colIndexes[this.grid._columnsById[colId].index] = true;
			if(count === undefined){
				count = rowIds.length;
			}else if(rowIds.length !== count){
				console.log('row count not same');
				return false;
			}
			if(!rowMap){
				rowMap = {};
				for(i = rowIds.length - 1; i >= 0; --i){
					rowMap[rowIds[i]] = true;
				}
			}else{
				for(i = rowIds.length - 1; i >= 0; --i){
					if(!rowMap[rowIds[i]]){
						console.log('row id not same');
						return false;
					}
				}
			}
		}

		var checkContinuous = function(arr){
			var start = 0;
			while(start < arr.length && !arr[start]){
				++start;
			}
			for(i = arr.length - 1; i >= start; --i){
				if(!arr[i]){
					return null;
				}
			}
			return {
				start: start,
				count: arr.length - start
			};
		};

		this._columnRange = checkContinuous(colIndexes);
		if(!this._columnRange){
			console.log('column not continuous');
			return false;
		}

		if(rowIds){
			var d = new dojo.Deferred(), _this = this, model = this.model;
			model.when({id: rowIds}, function(){
				var rowIndex, rowIndexes = [], indexToId = [];
				for(i = rowIds.length - 1; i >= 0; --i){
					rowIndex = model.idToIndex(rowIds[i]);
					rowIndexes[rowIndex] = true;
					indexToId[rowIndex] = rowIds[i];
				}
				_this._rowRange = checkContinuous(rowIndexes);
				if(_this._rowRange){
					_this._rowRange.indexToId = indexToId;
					d.callback(true);
				}else{
					console.log('row not continuous');
					d.callback(false);
				}
			});
			return d;
		}
		return false;
	},

	_extraCheckReady: function(evt){
		this._handle = evt;
		return this._selector.isSelected(evt.rowId, evt.columnId) && this._isDndShape;
	},

	_updateSourceSettings: function(){
		this.inherited(arguments);
	},

	_buildDndNodes: function(){
		var i, j, rowEnd, colEnd, rowId, colId, sb = [], columns = this.grid._columns;
		for(i = this._rowRange.start, rowEnd = i + this._rowRange.count; i < rowEnd; ++i){
			for(j = this._columnRange.start, colEnd = j + this._columnRange.count; j < colEnd; ++j){
				rowId = this._rowRange.indexToId[i];
				colId = columns[j].id;
				sb.push("<div id='", this.grid.id, "_dnditem_cell_", rowId, "_", colId, 
						"' rowid='", rowId, "' rowindex='", i, 
						"' columnid='", colId, "' columnindex='", j, 
						"'></div>");
			}
		}
		return sb.join('');
	},

	_getDndCount: function(){
		return this._rowRange.count * this._columnRange.count;
	},

	_createTargetAnchor: function(){
		var ta = this.inherited(arguments);
		ta.innerHTML = "<div class='dojoxGridxCellBorderLeftTopDIV'></div><div class='dojoxGridxCellBorderRightBottomDIV'></div>";
		return ta;
	},

	_clearCellMasks: function(){
		dojo.query(".dojoxGridxDnDCellMask", this.grid.bodyNode).forEach(function(cellNode){
			dojo.removeClass(cellNode, "dojoxGridxDnDCellMask");
		});
	},

	_destroyUI: function(){
		this.inherited(arguments);
		this._clearCellMasks();
	},
	
	_calcTargetAnchorPos: function(evt, containerPos){
		var height, width, left, top, pos1, pos2, bn = this.grid.bodyNode;

		this._clearCellMasks();

		var handleRowNode;
		dojo.query(".dojoxGridxRow", bn).some(function(rowNode){
			var pos = dojo.position(rowNode);
			if(evt.clientY >= pos.y && evt.clientY <= pos.y + pos.h){
				handleRowNode = rowNode;
				return true;
			}
		});

		if(handleRowNode){
			var originRowIndex = this._handle.rowIndex;
			var handleRowIndex = parseInt(dojo.attr(handleRowNode, 'rowindex'), 10);
			var firstRowIndex = handleRowIndex - originRowIndex + this._rowRange.start;
			var lastRowIndex = handleRowIndex + this._rowRange.start + this._rowRange.count - originRowIndex - 1;
			var rowStart = this.grid.body.logicalStart;
			var rowEnd = rowStart + this.grid.body.logicalCount - 1;
			if(firstRowIndex < rowStart){
				lastRowIndex += rowStart - firstRowIndex;
				firstRowIndex = rowStart;
			}else if(lastRowIndex > rowEnd){
				firstRowIndex -= lastRowIndex - rowEnd;
				lastRowIndex = rowEnd;
			}
			var firstRowNode = dojo.query("[rowindex='" + firstRowIndex + "']", bn)[0];
			var lastRowNode = dojo.query("[rowindex='" + lastRowIndex + "']", bn)[0];
			height = containerPos.h;
			top = containerPos.y;
			if(firstRowNode && lastRowNode){
				pos1 = dojo.position(firstRowNode);
				pos2 = dojo.position(lastRowNode);
				height = pos2.y + pos2.h - pos1.y;
				top = pos1.y;
			}else if(firstRowNode){
				pos1 = dojo.position(firstRowNode);
				height = containerPos.y + containerPos.h - pos1.y;
				top = pos1.y;
			}else if(lastRowNode){
				pos2 = dojo.position(lastRowNode);
				height = pos2.y + pos2.h - containerPos.y;
			}
			top -= containerPos.y;

			var handleCellNode;
			dojo.query("[rowindex='" + handleRowIndex + "'] .dojoxGridxCell", bn).some(function(cellNode){
				var pos = dojo.position(cellNode);
				if(evt.clientX >= pos.x && evt.clientX <= pos.x + pos.w){
					handleCellNode = cellNode;
					return true;
				}
			});

			if(handleCellNode){
				var originColIndex = this._handle.columnIndex;
				var handleColIndex = this.grid._columnsById[dojo.attr(handleCellNode, 'colid')].index;
				var firstColIndex = handleColIndex - originColIndex + this._columnRange.start;
				var lastColIndex = handleColIndex + this._columnRange.start + this._columnRange.count - originColIndex - 1;
				var colStart = 0;
				var colEnd = this.grid._columns.length - 1;
				if(firstColIndex < colStart){
					lastColIndex += colStart - firstColIndex;
					firstColIndex = colStart;
				}else if(lastColIndex > colEnd){
					firstColIndex -= lastColIndex - colEnd;
					lastColIndex = colEnd;
				}
				var firstColId = this.grid._columns[firstColIndex].id;
				var lastColId = this.grid._columns[lastColIndex].id;
				var firstCellNode = dojo.query("[rowindex='" + handleRowIndex + "'] [colid='" + firstColId + "']", bn)[0];
				var lastCellNode = dojo.query("[rowindex='" + handleRowIndex + "'] [colid='" + lastColId + "']", bn)[0];
				pos1 = dojo.position(firstCellNode);
				pos2 = dojo.position(lastCellNode);
				width = pos2.x + pos2.w - pos1.x;
				left = pos1.x - containerPos.x;

				var leftTopDiv = dojo.query(".dojoxGridxCellBorderLeftTopDIV", this._targetAnchor)[0];
				this._styleAnchorCorner(leftTopDiv, firstRowNode, firstRowIndex, firstColId);
				var rightBottomDiv = dojo.query(".dojoxGridxCellBorderRightBottomDIV", this._targetAnchor)[0];
				this._styleAnchorCorner(rightBottomDiv, lastRowNode, lastRowIndex, lastColId);
				
				if(this._checkCellAccept(firstRowIndex, firstColIndex)){
					this._target = {
						rowIndex: firstRowIndex,
						columnIndex: firstColIndex
					};
				}else{
					delete this._target;
				}

				return {
					left: left + "px",
					top: top + "px",
					width: width + "px",
					height: height + "px"
				};
			}
		}
		delete this._target;
		return null;
	},

	_styleAnchorCorner: function(cornerDiv, rowNode, rowIndex, colId){
		if(rowNode){
			var anchorBorderSize = (dojo.marginBox(cornerDiv).w - dojo.contentBox(cornerDiv).w) / 2;
			var cellNode = dojo.query("[rowindex='" + rowIndex + "'] [colid='" + colId + "']", this.grid.bodyNode)[0];
			if(cellNode){
				var pos = dojo.position(cellNode);
				dojo.style(cornerDiv, {
					display: "",
					width: (pos.w - anchorBorderSize) + "px",
					height: (pos.h - anchorBorderSize) + "px"
				});
				return;
			}
		}
		dojo.style(cornerDiv, "display", "none");
	},

	_checkCellAccept: function(targetRowIndex, targetColIndex){
		var i, j, cellNode, maskNode, pos, targetAnchorPos = dojo.position(this._targetAnchor),
			checker = this.grid.move.cell.checkCellMoveAccept, columns = this.grid._columns,
			ret = true;
		if(checker){
			for(i = 0; i < this._rowRange.count; ++i){
				for(j = 0; j < this._columnRange.count; ++j){
					cellNode = dojo.query("[rowindex='" + (i + targetRowIndex) + 
								"'] [colid='" + columns[j + targetColIndex].id + "']", this.grid.bodyNode)[0];
					if(cellNode && !checker(i + this._rowRange.start, 
								j + this._columnRange.start, 
								i + targetRowIndex, 
								j + targetColIndex, 
								this.grid)){
						dojo.addClass(cellNode, "dojoxGridxDnDCellMask");
						ret = false;
					}
				}
			}
		}
		dojo.dnd.manager().canDrop(ret);
		return ret;
	},

	_onDropInternal: function(nodes, copy){
		console.log("drop internal", nodes, copy);
		if(this._target){
			var mover = this.grid.move.cell;
			var oldValue = mover.copy;
			mover.copy = copy || this.copyWhenRearrange;
			mover.move({
				start: {
					row: this._rowRange.start,
					column: this._columnRange.start
				},
				end: {
					row: this._rowRange.start + this._rowRange.count - 1,
					column: this._columnRange.start + this._columnRange.count - 1
				}
			}, this._target.rowIndex, this._target.columnIndex);
			mover.copy = oldValue;
		}
	},

	_onDropExternalGrid: function(source, nodes, copy){
		console.log("drop external grid", source, nodes, copy);
	},

	_onDropExternalOther: function(source, nodes, copy){
		console.log("drop external other", source, nodes, copy);
	}
}));
});

