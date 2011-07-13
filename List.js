define(["xstyle/css!./css/dgrid.css", "dojo/_base/kernel", "xstyle/put", "dojo/_base/declare", "dojo/on", "dojo/aspect", "dojo/has", "dojo/has!touch?./TouchScroll", "dojo/_base/sniff"], 
function(css, dojo, put, declare, listen, aspect, has, TouchScroll){
	// allow for custom CSS class definitions 
	// TODO: figure out what to depend for this
	if(has("mozilla") || has("opera")){
		// firefox's focus doesn't work by default for divs prior to actually tabbing into it. This fixes that
		// (we don't do any other browsers because we are trying to stay as close to native as possible) 
		css.addRule(".dgrid *:focus", "outline: 1px dotted");
	}
	var scrollbarWidth;
	var byId = function(id){
		return document.getElementById(id);
	};
	function Row(id, object, element){
		this.id = id;
		this.data = object;
		this.element = element;
	}
	Row.prototype = {
		remove: function(){
			var rowElement = this.element;
			var contentNode = rowElement.parentNode;
			contentNode.removeChild(rowElement);
			var connected = rowElement.connected;
			if(connected){
				// if it has a connected node, remove that as well
				contentNode.removeChild(connected);
			}
		}
	};
	function move(item, steps){
		var nextSibling, current, element = current = item.element;
		steps = steps || 1;
		do{
			// move in the correct direction
			if(nextSibling = current[steps < 0 ? 'previousSibling' : 'nextSibling']){
				current = nextSibling;
				if(current.rowContainer){
					current = current[steps < 0 ? 'lastChild' : 'firstChild'];
				}
				var className = current && current.className;
				if(className && className.match(/dgrid-(cell|row)/)){
					// it's an element, counts as a real move
					element = current;
					steps += steps < 0 ? 1 : -1;
				}
			}else if(!(nextSibling = (current = current.parentNode).rowContainer)){ // intentional assignment
				steps = 0;
			}
		}while(nextSibling && steps);
		return element;		
	}
	function hasTabIndex(element){
		var tabIndexNode = element.getAttributeNode("tabIndex");
		return tabIndexNode && tabIndexNode.specified;
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
		css: css,
		getCSSClass: function(shortName){
			return "dgrid-" + shortName;
		},
		create: function(params, srcNodeRef){
			var domNode = this.domNode = srcNodeRef.nodeType ? srcNodeRef : byId(srcNodeRef);
			if(!this.id){
				this.id = domNode.id;
			}
			if(!hasTabIndex(domNode)){
				domNode.tabIndex = 0;
			}
			domNode.role = "grid";
			if(params){
				this.params = params;
				dojo.safeMixin(this, params);
			}

			if(domNode.tagName == "table"){
				// TODO: read columns from table
			}
			domNode.className += " ui-widget dgrid";
			this.refresh();
			var grid = this;
			listen(window, "resize", function(){
				grid.resize();
			});
			if(has("ie")){
				this.on("activate", function(event){
					var target = event.target;
					if(!target.type && !hasTabIndex(target)){
						// IE changes/loses focus when inner table cells even when it is not supposed to
						domNode.focus();
					}
				});
			}
		},
		refresh: function(){
			var domNode = this.domNode;
			var headerNode = this.headerNode = put(domNode, "div.dgrid-header.dgrid-header-row.ui-widget-header");
			var bodyNode = this.bodyNode = put(domNode, "div.dgrid-scroller");
			listen(bodyNode, "scroll", function(event){
				// keep the header aligned with the body
				headerNode.scrollLeft = bodyNode.scrollLeft;
				event.stopPropagation(); // we will refire, since browsers are not consistent about propagation here
				listen.emit(domNode, "scroll", {scrollTarget: bodyNode});
			});
			this.renderHeader(headerNode);
			this.resize();
			this.refreshContent();
			aspect.after(this, "scrollTo", function(){
				listen.emit(bodyNode, "scroll", {});
			});
			this.postCreate && this.postCreate();
		},
		resize: function(){
			var bodyNode = this.bodyNode;
			var headerNode = this.headerNode;
			bodyNode.style.top = headerNode.offsetHeight + "px";
			if(has("quirks")){
				// in quirks mode, the "bottom" CSS property is ignored, so do this to fix it
				// We might want to use a CSS expression or the xstyle package to fix this
				bodyNode.style.height = (this.domNode.offsetHeight - headerNode.offsetHeight) + "px";
			}
			if(!scrollbarWidth){ // we haven't computed the scroll bar width yet, do so now, and add a new rule if need be
				scrollbarWidth = bodyNode.offsetWidth - bodyNode.clientWidth;
				if(scrollbarWidth != 17){
					css.addRule(".dgrid-header", "right: " + scrollbarWidth + "px");
				}
			}
		},
		on: function(eventType, listener){
			// delegate events to the domNode
			var signal = listen(this.domNode, eventType, listener);
			if(!has("dom-addeventlistener")){
				this._listeners.push(signal);
			}
		},
		destroy: function(){
			// cleanup listeners
			for(var i = 0; i < this._listeners.length; i++){
				this._listeners.remove();
			}
		},
		refreshContent: function(){
			// summary:
			//		refreshes the contents of the grid
			this._rowIdToObject = {};
			if(this.contentNode){
				// remove the content so it can be recreated
				this.contentNode.innerHTML = "";
				// remove any listeners
				for(var i = 0;i < this.observers.length; i++){
					this.observers[i].cancel();
				}
				this.observers = [];
			}else{
				this.contentNode = put(this.bodyNode, "div.dgrid-content.ui-widget-content");
			}
			if(this.init){
				this.init({
					domNode: this.bodyNode,
					containerNode: this.contentNode
				});
			}
			this.preloadNode = null;
		},
		renderArray: function(results, beforeNode, options){
			// summary:
			//		This renders an array or collection of objects as rows in the grid, before the
			//		given node. This will listen for changes in the collection if an observe method
			//		is available (as it should be if it comes from an Observable data store).
			options = options || {};
			var start = options.start || 0;
			var self = this;
			if(!beforeNode){
				this.lastCollection = results;
			}
			var contentNode = this.contentNode;
			if(results.observe){
				// observe the results for changes
				this.observers.push(results.observe(function(object, from, to){
					// a change in the data took place
					if(from > -1){
						// remove from old slot
						self.row(rows.splice(from, 1)[0]).remove();
					}
					if(to > -1){
						// add to new slot
						var row = self.insertRow(object, rows[to], (options.start + to), options);
						row.className += " ui-state-highlight";
						setTimeout(function(){
							row.className = row.className.replace(/ ui-state-highlight/, '');
						}, 250);
						rows.splice(to, 0, row);
					}
				}, true));
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
				return self.insertRow(object, beforeNode, start++, options);
			}
			return rows;
		},
		_autoId: 0,
		renderHeader: function(){
			// no-op in a place list 
		},
		insertRow: function(object, beforeNode, i, options){
			// summary:
			//		Renders a single row in the grid
			var row = this.renderRow(object, options);
			row.className = (row.className || "") + " ui-state-default dgrid-row " + (i% 2 == 1 ? "dgrid-row-odd" : "dgrid-row-even");
			// get the row id for easy retrieval
			this._rowIdToObject[row.id = this.id + "-row-" + ((this.store && this.store.getIdentity) ? this.store.getIdentity(object) : this._autoId++)] = object;
			(beforeNode ? beforeNode.parentNode : this.contentNode).insertBefore(row, beforeNode || null);
			return row;
		},
		renderRow: function(value, options){
			return put("div", value);
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
						return new Row(rowId.substring(this.id.length + 5), object, target); 
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
		cell: function(target){
			// this doesn't do much in a plain list
			return {
				row: this.row(target)
			};
		},
		_move: move,
		up: function(row, steps){
			return this.row(move(row, -(steps || 1)));
		},
		down: function(row, steps){
			return this.row(move(row, steps || 1));
		},		
		sort: function(property, descending){
			// summary:
			//		Sort the content
			this.sortOrder = [{attribute: property, descending: descending}];
			this.refreshContent();
			if(this.lastCollection){
				this.lastCollection.sort(function(a,b){
					return a[property] > b[property] == !descending ? 1 : -1;
				})
				this.renderArray(this.lastCollection);
			}
		}
	});
});