define(["dojo/_base/html", "dojo/_base/declare", "dojo/listen", "dojo/aspect", "./TextEdit", "dojo/has", "dojo/has!touch?./TouchScroll", "cssx/css!./css/d-list.css"], function(dojo, declare, listen, aspect, TextEdit, has, TouchScroll){
	// allow for custom CSS class definitions 
	// TODO: figure out what to depend for this
	var byId = function(id){
		return document.getElementById(id);
	};
	var create = dojo.create;
	function Row(id, object, element){
		this.id = id;
		this.data = object;
		this.element = element;
	}
	return declare(TouchScroll ? [TouchScroll] : [], { 
		constructor: function(params, srcNodeRef){
		var self = this;
		if(typeof params == "function"){
			// mixins/plugins are being provided, we will mix then into the instance 
			var i = 0, mixin;
			while(typeof (mixin = arguments[i++]) == "function"){
				dojo.safeMixin(this, mixin.prototype);
			} 
			// shift the arguments to get the params and srcNodeRef for the new instantiation
			params = arguments[i - 1];
			srcNodeRef = arguments[i];
		}
		// summary:
		//		The set of observers for the data
		this.observers = [];
		this._listeners = [];
		this._rowIdToObject = {};
	/* TODO: Implement this to hide (detach from DOM) out-of-sight nodes to improve performance
	 * clearTop = function(){
		var scrollNode = self.bodyNode;
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
	};*/
			this.create(params, srcNodeRef);
		},
		minRowsPerPage: 25,
		maxRowsPerPage: 100,
		maxEmptySpace: 10000,
		queryOptions: {},
		query: {},
		createNode: create,
		rowHeight: 0,
		create: function(params, srcNodeRef){
			var domNode = this.domNode = srcNodeRef.nodeType ? srcNodeRef : byId(srcNodeRef);
			if(!this.id){
				this.id = domNode.id;
			}
			this.tabIndex = domNode.getAttribute("tabindex") || 0;
			domNode.role = "grid";
			if(params){
				this.params = params;
				dojo.safeMixin(this, params);
			}

			if(domNode.tagName == "table"){
				// TODO: read columns from table
			}
			domNode.className += "	ui-widget-content dojoxGridx";
			this.refresh();
		},
		refresh: function(){
			var headerNode = this.headerNode = create("div",{
				className: "dojoxGridxHeader dojoxGridxHeaderRow"
			},this.domNode);
			var bodyNode = this.bodyNode = create("div",{
				className: "dojoxGridxScroller"
			},this.domNode);
			listen(bodyNode, "scroll", function(event){
				// keep the header aligned with the body
				headerNode.scrollLeft = bodyNode.scrollLeft;
			});
			this.renderHeader();
			bodyNode.style.top = headerNode.offsetHeight + "px";
			if(dojo.isQuirks){
				// in quirks mode, the "bottom" CSS property is ignored, so do this to fix it
				// We might want to use a CSS expression or the cssx package to fix this
				bodyNode.style.height = (this.domNode.offsetHeight - headerNode.offsetHeight) + "px"; 
			}
			this.refreshContent();
			aspect.after(this, "scrollTo", this.onscroll);
			this.postCreate && this.postCreate();
		},
		on: function(eventType, listener){
			// delegate events to the domNode
			var signal = listen(this.domNode, eventType, listener);
			if(has("dom-addeventlistener")){
				this._listeners.push(signal);
			}
		},
		destroy: function(){
			// cleanup listeners
			for(var i = 0; i < this._listeners.length; i++){
				this._listeners.cancel();
			}
		},
		refreshContent: function(){
			// summary:
			//		refreshes the contents of the grid
			if(this.contentNode){
				// remove the content so it can be recreated
				this.contentNode.innerHTML = "";
				// remove any listeners
				for(var i = 0;i < this.observers.length; i++){
					this.observers[i].cancel();
				}
				this.observers = [];
			}else{
				this.contentNode = create("div",{
					className:"dojoxGridxContent"
				}, this.bodyNode);
			}
			if(this.init){
				this.init({
					domNode: this.bodyNode,
					containerNode: this.contentNode
				});
			}
			this.preloadNode = null;
		},
		renderCollection: function(results, beforeNode, options){
			// summary:
			//		This renders an array or collection of objects as rows in the grid, before the
			//		given node. This will listen for changes in the collection if an observe method
			//		is available (as it should be if it comes from an Observable data store).
			options = options || {};
			var start = options.start || 0;
			var self = this;
			var contentNode = this.contentNode;
			if(results.observe){
				// observe the results for changes
				this.observers.push(results.observe(function(object, from, to){
					// a change in the data took place
					if(from > -1){
						// remove from old slot
						var tr = rows.splice(from, 1)[0];
						contentNode.removeChild(tr);
					}
					if(to > -1){
						// add to new slot
						var tr = self.createRow(object, rows[to], (options.start + to), options);
						rows.splice(to, 0, tr);
					}
				}));
			}
			// now render the results
			if(results.map){
				var rows = results.map(mapEach, console.error);
			}else{
				var rows = [];
				for(var i = 0, l = results.length; i < l; i++){
					rows[i] = mapEach(results[i]);
				}
			}
			function mapEach(object){
				return self.createRow(object, beforeNode, start++, options);
			}
			return rows;
		},
		_autoId: 0,
		renderHeader: function(){
			// no-op in a place list 
		},
		createRow: function(object, beforeNode, i, options){
			// summary:
			//		Renders a single row in the grid
			var row = this.renderRow(object, options);
			row.className = (row.className || "") + " ui-state-default dojoxGridxRow " + (i% 2 == 1 ? "dojoxGridxRowOdd" : "dojoxGridxRowEven");
			// get the row id for easy retrieval
			this._rowIdToObject[row.id = this.id + "-row-" + ((this.store && this.store.getIdentity) ? this.store.getIdentity(object) : this._autoId++)] = object;
			this.contentNode.insertBefore(row, beforeNode);
			return row;
		},
		renderRow: function(value, options){
			return dojo.create("div", {
				innerHTML: value
			});
		},
		row: function(target){
			// summary:
			//		Get the row object by id, object, node, or event
			if(target.target && target.target.nodeType == 1){
				// event
				target = target.target;
			}
			if(target.nodeType == 1){
				var object;
				do{
					var rowId = target.id;
					if(object = this._rowIdToObject[rowId]){
						return new Row(rowId.substring(rowId.indexOf("-row-") + 5), object, target); 
					}
					target = target.parentNode;
				}while(target && target != this.domNode);
				return;
			}
			if(typeof target == "object"){
				var id = this.store.getIdentity(target);
			}else{
				var id = target;
				target = this._rowIdToObject[this.id + "-row-" + id];
			}
			return new Row(id, target, byId(this.id + "-row-" + id));
		},
		rowByIndex: function(index){
			
		}
	});
});