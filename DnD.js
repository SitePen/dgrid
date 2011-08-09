define(["dojo/_base/declare", "dojo/_base/lang", "./List", "dojo/dnd/Source", "xstyle/put", "dojo/on", "xstyle/css!dojo/resources/dnd.css"], function(declare, lang, List, DnDSource, put, on){
	function setupDnD(grid){
		if(grid.dndTarget){
			return;
		}
		var store = grid.store;
		// make the contents a DnD source/target
		var targetSource = grid.dndTarget = new DnDSource(grid.bodyNode, 
			lang.delegate(grid.dndTargetConfig, {dropParent: grid.contentNode}));
		targetSource.getObject = function(node){
			var row = grid.row(node);
			return store.get(row.id);
		}
		targetSource.onDrop = function(sourceSource, nodes){
			// on drop, move get the objects and move them
			var targetRow = targetSource.targetAnchor && grid.row(targetSource.targetAnchor);
			dojo.when(targetRow && store.get(targetRow.id), function(target){
				nodes.forEach(function(node){
					dojo.when(sourceSource.getObject(node), function(object){
						store.put(object, {before: target});
					});
				});
			});
		};
	}
	return declare([List], {
		dndSourceType: "row",
		dndTargetConfig: {
			accept: ["row"],
			creator: function(){
				// this is used to create the content under the avatar. Not sure what we really want here
				return {
					node: put("div"),
					data: {},
					type: []
				};
			}
		},
		postCreate: function(){
			this.inherited(arguments);
			setupDnD(this);
		},
		insertRow: function(object){
			// override to add dojoDndItem class to make the rows draggable
			var row = this.inherited(arguments);
			put(row, '.dojoDndItem');
			// setup the source if it hasn't been done yet
			setupDnD(this);
			this.dndTarget.setItem(row.id, {data: object, type: [this.dndSourceType]});
			return row;
		}
	});
});
