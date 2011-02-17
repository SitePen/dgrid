(function(){
function has(){
	return document.createElement("div").ontouchstart === null;
}
define(["compose", "uber/listen", "uber/aop", "./TextEdit", true || has("event-touch") ? "./TouchScroll": null, "style/css!./css/list"], function(Compose, listen, aop, TextEdit, TouchScroll){
	// allow for custom CSS class definitions 
	// TODO: figure out what to depend for this
	var byId = function(id){
		return document.getElementById(id);
	};
	var create = function(tag, props, target){
		var node = document.createElement(tag);
		Compose.call(node, props);
		if(props.style){
			Compose.call(node.style, props.style);
		}
		if(target){
			target.appendChild(node);
		}
		return node;
	};
	
	return Compose(TouchScroll, function(params, srcNodeRef){
		var self = this;
		// summary:
		//		The set of observers for the data
		this.observers = [];
		this._rowIdToObject = {};
	clearTop = function(){
		var scrollNode = self.scrollNode;
		var transform = self.contentNode.style.webkitTransform;
		var visibleTop = scrollNode.scrollTop + (transform ? -transform.match(/translate[\w]*\(.*?,(.*?)px/)[1] : 0);
		
		var elements = self.contentNode.childNodes;
		for(var i = 0; i < elements.length; i++){
			if(elements[i].offsetTop > visibleTop){
				break;
			}
		}
		self.otherNode = create("div", {
		});
		var last = elements[i];
		for(; i > 0; i--){
			self.otherNode.appendChild(elements[i -1]);
		}
		var node = create("div", {
			style: {
				height: visibleTop + "px"
			}
		});
		self.contentNode.insertBefore(node, last);
	};
			this.create(params, srcNodeRef);
		},{
		minRowsPerPage: 25,
		maxRowsPerPage: 100,
		maxEmptySpace: 10000,
		queryOptions: {},
		query: {},
		createNode: create,
		structure: [],
		rowHeight: 0,
		create: function(params, srcNodeRef){
			this.domNode = srcNodeRef.nodeType ? srcNodeRef : byId(srcNodeRef);
			if(params){
				this.params = params;
				Compose.call(this, params);
			}

			if(this.domNode.tagName == "table"){
				
			}
			this.domNode.className += "	ui-widget-content";
			this.headerNode = create("div",{
				className: "d-list-header"
			},this.domNode);
			this.scrollNode = create("div",{
				className: "d-list-scroller"
			},this.domNode);
			this.renderHeader();
			this.refreshContent();
			aop.after(this, "scrollTo", this.onscroll);
		},
		on: function(eventType, listener){ 
			// delegate events to the domNode
			return listen(this.domNode, eventType, listener);
		},
		refreshContent: function(){
			// summary:
			//		refreshes the contents of the table
			if(this.contentNode){
				// remove the content so it can be recreated
				this.scrollNode.removeChild(this.contentNode);
				// remove any listeners
				for(var i = 0;i < this.observers.length; i++){
					this.observers[i].dismiss();
				}
				this.observers = [];
			}
			this.contentNode = create("div",{
				style: {
					width:"32000px"
				}
			}, this.scrollNode);
			if(this.init){
				this.init({
					domNode: this.scrollNode,
					containerNode: this.contentNode
				});
			}
			this.preloadNode = null;
		},
		renderCollection: function(results, beforeNode, options){
			// summary:
			//		This renders an array or collection of objects as rows in the table, before the
			//		given node. This will listen for changes in the collection if an observe method
			//		is available (as it should be if it comes from an Observable data store).
			var start = options.start || 0;
			var self = this;
			var contentNode = this.contentNode;
			if(results.observe){
				// observe the results for changes
				this.observers.push(results.observe(function(object, from, to){
					// a change in the data took place
					if(from > -1){
						// remove from old slot
						var tr = trs.splice(from, 1)[0];
						contentNode.removeChild(tr);
					}
					if(to > -1){
						// add to new slot
						var tr = self.renderRow(object, trs[to], (options.start + to) % 2 == 1, options);
						trs.splice(to, 0, tr);
					}
				}));
			}
			// now render the results
			// TODO: if it is raw array, we can't rely on map
			var trs = results.map(function(object){
				return self.renderRow(object, beforeNode, start++ % 2 == 1, options);
			}, console.error);
			return trs;
		},
		_autoId: 0,
		renderHeader: function(){
			// no-op in a place list 
		},
		renderRow: function(object, beforeNode, odd, options){
			// summary:
			//		Renders a single row in the table
			var tr = create("div",{
				className: "d-list-row " + (odd ? "d-list-row-odd" : "d-list-row-even")
			});
			// get the row id for easy retrieval
			this._rowIdToObject[tr.id = this.id + "-row-" + ((this.store && this.store.getIdentity) ? this.store.getIdentity(object) : this._autoId++)] = object;
			this.renderRowContents(tr, object, options);  
			this.contentNode.insertBefore(tr, beforeNode);
			return tr;
		},
		renderRowContents: function(tr, value){
			tr.innerHTML = value;
		},
		getRowNode: function(objectOrId){
			// summary:
			//		Get the row node for an object or id
			if(typeof objectOrId == "object"){
				objectOrId = this.store.getIdentity(objectOrId);
			}
			return byId(this.id + "-row-" + objectOrId);
		},
		getObject: function(node){
			// summary:
			//		Get the object for a given node (can be a tr or any child of it)
			node = node.target || node;
			var object;
			do{
				if((object = this._rowIdToObject[node.id])){
					return object;
				}
				node = node.parentNode;
			}while(node && node != this.domNode);
		},
		getObjectId: function(node){
			// summary:
			//		Get the object id for a given node (can be a tr or any child of it)
			node = node.target || node;
			do{
				var rowId = node.id;
				if(this._rowIdToObject[rowId]){
					return rowId.substring(rowId.indexOf("-row-") + 5);
				}
				node = node.parentNode;
			}while(node && node != this.domNode);
		}
	});
});
})();