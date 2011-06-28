define(['dojo', './_Base'], function(dojo, _Base){

return dojox.grid.gridx.core.registerModule(
dojo.declare('dojox.grid.gridx.modules.dnd.Column', _Base, {
	name: 'dndColumn',
	
	required: ['selectColumn', 'moveColumn'],

	type: "Column",

	accept: ["grid/cols"],
	
	canDragIn: false,

	canDragOut: false,

	_load: function(){
		this._selector = this.grid.select.column;
	},
	
	_extraCheckReady: function(evt){
		return this._selector.isSelected(evt.columnId);
	},
	
	_buildDndNodes: function(){
		var sb = [], colIds = this._selectedColIds = this._selector.getSelectedIds();
		dojo.forEach(colIds, function(colId){
			sb.push("<div id='", this.grid.id, "_dnditem_column_", colId, "' columnid='", colId, "'></div>");
		});
		return sb.join('');
	},

	_getDndCount: function(){
		return this._selectedColIds.length;
	},
	
	_calcTargetAnchorPos: function(evt, containerPos){
		var node = evt.target, _this = this, columns = this.grid._columns;
		var func = function(n){
			var id = dojo.attr(n, 'colid');
			var index = _this.grid._columnsById[id].index;
			if(_this._selector.isSelected(id)){
				while(index > 0 && _this._selector.isSelected(columns[index - 1].id)){
					--index;
				}
				n = dojo.query(".dojoxGridxHeaderRow [colid='" + columns[index].id + "']", _this.grid.headerNode)[0];
			}
			_this._target = n ? index : undefined;
			return n && {
				height: containerPos.h + "px",
				left: (dojo.position(n).x - containerPos.x) + "px"
			};
		};
		while(node){
			if(dojo.hasClass(node, 'dojoxGridxCell')){
				return func(node);
			}
			node = node.parentNode;
		}
		//For FF, when dragging from another grid, the evt.target is always grid.bodyNode!
		// so have to get the cell node by position, which is very slow.
		var rowNode = dojo.query(".dojoxGridxRow", this.grid.bodyNode)[0];
		if(dojo.isFF && dojo.query(".dojoxGridxCell", rowNode).some(function(cellNode){
			var cellPos = dojo.position(cellNode);
			if(cellPos.x <= evt.clientX && cellPos.x + cellPos.w >= evt.clientX){
				node = cellNode;
				return true;
			}
		})){
			return func(node);
		}
		return null;
	},
	
	_onDropInternal: function(nodes, copy){
		console.log("_onDropInternal: ", nodes, copy);
		if(this._target >= 0){
			var indexes = dojo.map(this._selectedColIds, function(colId){
				return this.grid._columnsById[colId].index;
			}, this);
			this.grid.move.column.move(indexes, this._target);
		}
	},
	
	_onDropExternalGrid: function(source, nodes, copy){
		//TODO: Support drag in columns from another grid
	},
	
	_onDropExternalOther: function(source, nodes, copy){
		console.log("_onDropExternalOther: ", source, nodes, copy);
	}
}));
});

