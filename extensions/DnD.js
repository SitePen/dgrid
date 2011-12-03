define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/dnd/Source", "dojo/dnd/Manager", "put-selector/put", "xstyle/css!dojo/resources/dnd.css"],
function(declare, lang, Deferred, DnDSource, DnDManager, put){
	// TODOC: store requirements
	// * requires a store (sounds obvious, but not all Lists/Grids have stores...)
	// * must support options.before in put calls
	//   (if undefined, put at end)
	// * should support copy
	//   (copy should also support options.before as above)
	
	// TODOs:
	// * consider sending items rather than nodes to onDropExternal/Internal
	// * consider emitting store errors via OnDemandList._trackError
	
	var GridDnDSource = declare(DnDSource, {
		grid: null,
		getObject: function(node){
			// summary:
			//		getObject is a method which should be defined on any source intending
			// 		on interfacing with dgrid DnD
			var grid = this.grid;
			return grid.store.get(grid.row(node).id);
		},
		_legalMouseDown: function(evt){
			// summary:
			// 		fix _legalMouseDown to only allow starting drag from an item
			// 		(not from bodyNode outside contentNode)
			var legal = this.inherited("_legalMouseDown", arguments);
			// DnDSource.prototype._legalMouseDown.apply(this, arguments);
			return legal && evt.target != this.grid.bodyNode;
		},

		// DnD method overrides
		onDrop: function(sourceSource, nodes, copy){
			// summary:
			// 		on drop, determine where to move/copy the objects
			var targetSource = this,
				targetRow = this._targetAnchor = this.targetAnchor, // save for Internal
				grid = this.grid,
				store = grid.store;
			
			if(!this.before && targetRow){
				// target before next node if dropped within bottom half of this node
				// (unless there's no node to target at all)
				targetRow = targetRow.nextSibling;
			}
			targetRow = targetRow && grid.row(targetRow);
			
			Deferred.when(targetRow && store.get(targetRow.id), function(target){
				// Note: if dropping after the last row, or into an empty grid,
				// target will be undefined.  Thus, it is important for store to place
				// item last in order if options.before is undefined.
				
				// Delegate to onDropInternal or onDropExternal for rest of logic.
				// These are passed the target item as an additional argument.
				if(targetSource != sourceSource){
					targetSource.onDropExternal(sourceSource, nodes, copy, target);
				}else{
					targetSource.onDropInternal(nodes, copy, target);
				}
			});
		},
		onDropInternal: function(nodes, copy, targetItem){
			var targetSource = this,
				anchor = targetSource._targetAnchor,
				targetRow = this.before ? anchor.previousSibling : anchor.nextSibling,
				store = this.grid.store;
			
			// Don't bother continuing if the drop is really not moving anything.
			// (Don't need to worry about edge first/last cases since
			// dropping directly on self doesn't fire onDrop)
			if(!copy && targetRow === nodes[0]){ return; }
			
			nodes.forEach(function(node){
				Deferred.when(targetSource.getObject(node), function(object){
					// For copy DnD operations, copy object, if supported by store;
					// otherwise settle for put anyway.
					// (put will relocate an existing item with the same id, i.e. move).
					store[copy && store.copy ? "copy" : "put"](object, {
						before: targetItem
					});
				});
			});
		},
		onDropExternal: function(sourceSource, nodes, copy, targetItem){
			// Note: this default implementation expects that two grids do not
			// share the same store.  There may be more ideal implementations in the
			// case of two grids using the same store (perhaps differentiated by
			// query), dragging to each other.
			var store = this.grid.store,
				sourceGrid = sourceSource.grid;
			
			// TODO: bail out if sourceSource.getObject isn't defined?
			nodes.forEach(function(node, i){
				Deferred.when(sourceSource.getObject(node), function(object){
					if(!copy){
						if(sourceGrid){
							// Remove original in the case of inter-grid move.
							// (Also ensure dnd source is cleaned up properly)
							Deferred.when(sourceGrid.store.getIdentity(object), function(id){
								!i && sourceSource.selectNone(); // deselect all, one time
								sourceSource.delItem(node.id);
								sourceGrid.store.remove(id);
							});
						}else{
							sourceSource.deleteSelectedNodes();
						}
					}
					// Copy object, if supported by store; otherwise settle for put
					// (put will relocate an existing item with the same id).
					// Note that we use store.copy if available even for non-copy dnd:
					// since this coming from another dnd source, always behave as if
					// it is a new store item if possible, rather than replacing existing.
					store[store.copy ? "copy" : "put"](object, {
						before: targetItem
					});
				});
			});
		},
		
		onDndStart: function(source, nodes, copy){
			// summary:
			// 		listen for start events to apply style change to avatar
			
			this.inherited(arguments); // DnDSource.prototype.onDndStart.apply(this, arguments);
			if(source == this){
				// Set avatar width to half the grid's width.
				// Kind of a naive default, but prevents ridiculously wide avatars.
				DnDManager.manager().avatar.node.style.width =
					this.grid.domNode.offsetWidth / 2 + "px";
			}
		},
		
		checkAcceptance: function(source, nodes){
			// summary:
			// 		augment checkAcceptance to block drops from sources without getObject
			return source.getObject &&
				DnDSource.prototype.checkAcceptance.apply(this, arguments);
		}		
		// TODO: could potentially also implement copyState to jive with default
		// onDrop* implementations (checking whether store.copy is available);
		// not doing that just yet until we're sure about default impl.
	});
	
	function setupDnD(grid){
		if(grid.dndTarget){
			return;
		}
		// make the contents a DnD source/target
		grid.dndTarget = new GridDnDSource(
			grid.bodyNode,
			lang.delegate(grid.dndTargetConfig, {
				// add cross-reference to grid for potential use in inter-grid drop logic
				grid: grid,
				dropParent: grid.contentNode
			})
		);
	}
	
	var DnD = declare([], {
		dndSourceType: "row",
		dndTargetConfig: null,
		postMixInProperties: function(){
			this.inherited(arguments);
			// initialize default dndTargetConfig
			this.dndTargetConfig = {
				accept: [this.dndSourceType]
			};
		},
		postCreate: function(){
			this.inherited(arguments);
			setupDnD(this);
		},
		insertRow: function(object){
			// override to add dojoDndItem class to make the rows draggable
			var row = this.inherited(arguments);
			put(row, ".dojoDndItem");
			// setup the source if it hasn't been done yet
			setupDnD(this);
			this.dndTarget.setItem(row.id, {data: object, type: [this.dndSourceType]});
			return row;
		}
	});
	DnD.GridSource = GridDnDSource;
	
	return DnD;
});
