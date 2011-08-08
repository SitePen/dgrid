define(['dojo', './_Base'], function(dojo, _Base){

return dojo.declare([_Base], {
	type: "Row",

	accept: ["grid/cells"],

	copyWhenDragOut: false,

	postCreate: function(args){
		this.inherited(arguments);
		//this._selector = this.grid.select.row;
		//this._setIdentity = args.setIdentityForNewItem || this.grid.setIdentityForNewItem;
	},

	_extraCheckReady: function(evt){
		return true; // this._selector.isSelected(evt.rowId);
	},

	_buildDndNodes: function(){
		var sb = [];
		for(var rowId in this.selection){
			if(this.selection[rowId] === true){
				sb.push("<div id='", this.id, "_dnditem_row_", rowId, "' rowid='", rowId, "'></div>");
			}
		}
		return sb.join('');
	},

	_getDndCount: function(){
		var count = 0;
		for(var i in this.selection){
			count++;
		}
		return count;
	},
	
	_calcTargetAnchorPos: function(evt, containerPos){
		var node = evt.target, body = this.body, _this = this; 
		var func = function(n){
			var row = _this.row(n);
			if(row.id in _this.selection){
				var prenode = row.element.previousSibling;
				while(prenode && _this.row(prenode).id in _this.selection){
					prenode = prenode.previousSibling;
				}
			}
			_this._target = row.id
			return n && {
				width: containerPos.w + "px",
				top: (dojo.position(n).y - containerPos.y) + "px"
			};
		};
		while(node){
			if(dojo.hasClass(node, this.getCSSClass("row"))){
				return func(node);
			}
			node = node.parentNode;
		}
		//For FF, when dragging from another grid, the evt.target is always grid.bodyNode!
		// so have to get the row node by position, which is very slow.
		if(dojo.isFF && dojo.query(this.getCSSClass("row"), this.bodyNode).some(function(rowNode){
			var rowPos = dojo.position(rowNode);
			if(rowPos.y <= evt.clientY && rowPos.y + rowPos.h >= evt.clientY){
				node = rowNode;
				return true;
			}
		})){
			return func(node);
		}
		return null;
	},
	
	_onDropInternal: function(nodes, copy){
		console.log("Row drop internal: ", nodes, copy);
		var
			store = this.store,
			grid = this,
			idoffset = (this.id + "_dnditem_row_").length;
		
		dojo.when(store.get(this._target), function(target){
			for(var i = 0; i < nodes.length; i++){
				var node = nodes[i];
				var id = node.id.substring(idoffset);
				dojo.when(store.get(id), function(object){
					dojo.when(store.put(object, { before: target }), function(){
						//This might be overkill, but prevents desync of neighboring rows
						grid.refreshContent();
					});
				});
			}
		});
	},
	
	_onDropExternalGrid: function(source, nodes, copy){
		var rowIds = source.dndRow._selectedRowIds;
		var sourceGrid = source.dndRow.grid;
		var sourceStore = sourceGrid.store;
		var thisGrid = this;
		var thisStore = thisGrid.store;
		var target = this._target;
		var size;
		sourceGrid.model.when({id: rowIds}, function(){
			size = thisGrid.model.size();
			dojo.forEach(rowIds, function(rowId){
				var rowCache = sourceGrid.model.id(rowId);
				var toAdd = dojo.clone(rowCache.rawData);
				try{
					thisStore.add(toAdd);
					
					if(!copy && !source.dndRow.copyWhenDragOut){
						//Remove row from source grid
						sourceStore.remove(rowId);
					}
				}catch(e){
					console.error("Fatal Error: gridx.modules.dnd.Row: ", e);
				}
			});
			//FIXME: this doesn't exist in dgrid
			thisGrid.move.row.moveRange(size, rowIds.length, target);
		});
	},
	
	_onDropExternalOther: function(source, nodes, copy){
		console.log("drop external other: ", source, nodes, copy);
	}
});
});

