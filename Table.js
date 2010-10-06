dojo.provide("dojox.table.Table");
dojo.require("dojox.table.TextEdit");

(function(){
	// allow for custom CSS class definitions 
	var classes = {
		preload:"preload",
		loading:"loading",
		odd:"dijitTextBox",
		even:"even",
		selected: "dijitTreeRowSelected",
		header: "dijitTreeRow dijitTreeRowSelected"
	};
	var create = dojo.create;
	dojo.declare("dojox.table.Table", dijit._Widget||null, {
		_rowIdToObject:{},
		classes: classes,
		minRowsPerPage: 25,
		maxRowsPerPage: 100,
		maxEmptySpace: 5000,
		queryOptions: {},
		query: {},
		_blankGif: (dojo.config.blankGif || dojo.moduleUrl("dojo", "resources/blank.gif")).toString(),
		structure: [],
		rowHeight: 0,
		postscript: function(params, srcNodeRef){
			this.create(params, srcNodeRef);
		},
		create: function(params, srcNodeRef){
			this.domNode = dojo.byId(srcNodeRef);
			if(params){
				this.params = params;
				dojo._mixin(this, params);
			}

			if(this.domNode.tagName == "table"){
				
			}
			this.headerNode = create("table",{},this.domNode);
			this.scrollNode = create("div",{
				style: {
					overflowY:"auto",
					height:(this.domNode.offsetHeight - 25) + "px" 
				}
			},this.domNode);
			this.renderHeader();
			this.refreshContent();
			var self = this;
			// check visibility on scroll events
			dojo.connect(this.scrollNode, "onscroll", function(){
				self.checkVisible();
			});
			//this.inherited(arguments);
			
			// setup touch handling:
			var momentum, movement, lastY;
			function coords(andThen){
				return function(e){
					var touch = e.touches[0];
					andThen(y = touch.pageY, e);
					lastY = y;
				}
			}
			// do the scrolling in response to touch gestures
			function move(y){
				self.scrollNode.scrollTop = self.scrollNode.scrollTop + y
			}
			dojo.connect(this.scrollNode, "ontouchstart", coords(function(y){
				clearInterval(movement);
			}));
			dojo.connect(this.scrollNode, "ontouchmove",  coords(function(y, e){
				e.preventDefault();
				move(lastY - y);
				// measure the momentum
				momentum = lastY - y;
			}));
			dojo.connect(this.scrollNode, "ontouchend", function(){
				// setup the continued movement of momentum after the gesture
				movement = setInterval(function(){
					// continue until we run out of steam
					if(Math.abs(momentum) > 2){
						move(momentum);
						// gradually reduce the momentum
						momentum += (momentum > 0 ? -1 : 1);
					}else{
						// we are done with the gesture
						clearInterval(movement);
					}				
				}, 30);
			});
		},
		sortOrder: null,
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
			}
			this.contentNode = create("table",{}, this.scrollNode);
			this.renderColumnSizing();
			var self = this;
			this.preloadNode = null;
			if(this.store){
				// render the query
				this.renderQuery(function(queryOptions){
					queryOptions.sort = self.sortOrder;
					return self.store.query(self.query, queryOptions);
				});
			}
		},
		sort: function(attribute, descending){
			// summary:
			//		Sort the content
			this.sortOrder = [{attribute: attribute, descending: descending}];
			this.refreshContent();
		},
		lastScrollTop: 0,
		checkVisible: function(){
			// summary:
			//		Checks to make sure that everything in the viewable area has been 
			// 		downloaded, and triggering a request for the necessary data when needed.
			var scrollNode = this.scrollNode;
			var visibleTop = scrollNode.scrollTop;
			var visibleBottom = scrollNode.offsetHeight + visibleTop;
			var priorPreload, preloadNode = this.preloadNode;
			var lastScrollTop = this.lastScrollTop;
			this.lastScrollTop = visibleTop;
			// there can be multiple preloadNodes (if they split, or multiple queries are created),
			//	so we can traverse them until we find whatever is in the current viewport, making
			//	sure we don't backtrack
			while(preloadNode && preloadNode != priorPreload){
				priorPreload = this.preloadNode; 
				this.preloadNode = preloadNode;
				var preloadTop = preloadNode.offsetTop;
				var preloadHeight;
				if(visibleBottom < preloadTop){
					// the preload is below the line of site
					preloadNode = preloadNode.previous;
				}else if(visibleTop > (preloadTop + (preloadHeight = preloadNode.offsetHeight))){
					// the preload is above the line of site
					preloadNode = preloadNode.next;
				}else{
					// the preload node is visible, or close to visible, better show it
					var offset = (visibleTop - preloadTop) / this.rowHeight;
					var count = (visibleBottom - visibleTop) / this.rowHeight;
					// utilize momentum for predictions
					var momentum = Math.max(Math.min((visibleTop - lastScrollTop) * this.rowHeight, this.maxRowsPerPage/2), this.maxRowsPerPage/-2);
					count += Math.abs(momentum);
					if(momentum < 0){ 
						offset += momentum;
					}
					offset = Math.max(offset, 0);
					if(offset < 10 && offset > 0 && count + offset < this.maxRowsPerPage){
						// connect to the top of the preloadNode if possible to avoid splitting
						count += offset;
						offset = 0;
					}
					// TODO: do this for the bottom too
					count = Math.max(count, this.minRowsPerPage);
					count = Math.min(count, this.maxRowsPerPage);
					count = Math.min(count, preloadNode.count);
					if(count == 0){
						return;
					}
					offset = Math.round(offset);
					count = Math.round(count);
					var options = this.queryOptions ? dojo.delegate(this.queryOptions) : {};
					options.start = preloadNode.start + offset;
					options.count = count;
					if(offset > 0 && offset + count < preloadNode.count){
						// TODO: need to do a split 
						var second = dojo.clone(preloadNode);
					}else{
						preloadNode.start += count;
						preloadNode.count -= count;
						preloadNode.style.height = Math.min(preloadNode.count * this.rowHeight, this.maxEmptySpace);
					}
					// create a loading node as a placeholder while the data is loaded 
					var loadingNode = create("tr",{
						className: classes.loading,
						style: {
							height: count * this.rowHeight
						}
					});
					this.contentNode.insertBefore(loadingNode, preloadNode);
					// use the query associated with the preload node to get the next "page"
					options.query = preloadNode.query;
					var results = preloadNode.query(options);
					dojo.when(this.renderCollection(results, loadingNode, options),
						function(){
							// can remove the loading node now
							loadingNode.parentNode.removeChild(loadingNode);
						}, console.error);
				}
			}
		},
		
		renderQuery: function(query, preloadNode){
			// summary:
			//		Creates a preload node for rendering a query into, and executes the query
			//		for the first page of data. Subsequent data will be downloaded as it comes
			//		into view.
			preloadNode = preloadNode || create("tr", {
				className: classes.preload
			}, this.contentNode);
			// this preload node is used to represent the area of the table that hasn't been 
			// downloaded yet
			preloadNode.preload = true;
			preloadNode.query = query;
			preloadNode.start = this.minRowsPerPage;
			preloadNode.count = 0;
			var priorPreload = this.preloadNode;
			if(priorPreload){
				// the preload nodes (if there are multiple) are represented as a linked list, need to insert it
				if((preloadNode.next = priorPreload.next)){
					var previous = preloadNode.next.previous; 
				}
				preloadNode.previous = previous;
				preloadNode.next = preloadNode;
			}else{
				this.preloadNode = preloadNode;
			}
			var options = {start: 0, count: this.minRowsPerPage, query: query};
			// execute the query
			var results = query(options);
			var self = this;
			// render the result set
			dojo.when(this.renderCollection(results, preloadNode, options), function(trs){
				return dojo.when(results.total || results.length, function(total){
					// now we need to adjust the height and total count based on the first result set
					var height = 0;
					for(var i = 0, l = trs.length; i < l; i++){
						height += trs[i].offsetHeight;
					} 
					self.rowHeight = height / l;
					total -= trs.length;
					preloadNode.style.height = Math.min(total * self.rowHeight, self.maxEmptySpace) + "px";
					preloadNode.count = total;
					preloadNode.start = trs.length; 
					// can remove the loading node now
				});
			}, console.error);
			return preloadNode;
		},
		// summary:
		//		The set of observers for the data
		observers: [],
		renderCollection: function(results, beforeNode, options){
			// summary:
			//		This renders an array or collection of objects as rows in the table, before the
			//		given node. This will listen for changes in the collection if an observe method
			//		is available (as it should be if it comes from an Observable data store).
			var start = options.start || 0;
			var self = this;
			if(results.observe){
				// observe the results for changes
				this.observers.push(results.observe(function(object, from, to){
					// a change in the data took place
					if(from > -1){
						// remove from old slot
						var tr = trs.splice(from, 1)[0];
						tr.parentNode.removeChild(tr);
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
		renderRow: function(object, beforeNode, odd, options){
			// summary:
			//		Renders a single row in the table
			var tr = create("tr",{
				className: classes[odd ? "odd" : "even"]
			});
			// get the row id for easy retrieval
			this._rowIdToObject[tr.id = this.id + "-row-" + ((this.store && this.store.getIdentity) ? this.store.getIdentity(object) : this._autoId++)] = object;  
			for(var i = 0, l = this.structure.length; i < l; i++){
				// iterate through the columns
				var column = this.structure[i];
				var td = create("td",{
				});
				var data = object;
				// we support the field, get, and formatter properties like the DataGrid
				if(column.field){
					data = data[column.field];
				}
				if(column.get){
					data = column.get(data);
				}
				data = data && data.toString().replace(/</g, '&lt;').replace(/&/g, "&amp;");
				if(column.formatter){
					data = column.formatter(data);
					td.innerHTML = data;
				}else if(!column.renderCell){
					td.appendChild(document.createTextNode(data));
				}
				// A column can provide a renderCell method to do its own DOM manipulation, 
				// event handling, etc.
				if(column.renderCell){
					column.renderCell(data, td, options);
				}
				// add the td to the tr at the end for better performance
				tr.appendChild(td);
			}
			this.contentNode.insertBefore(tr, beforeNode);
			return tr;
		},
		renderHeader: function(){
			// summary:
			//		Setup the headers for the table
			var tr = create("tr",{
			});
			var ths = [];
			var table = this;
			for(var i = 0, l = this.structure.length; i < l; i++){
				var column = this.structure[i];
				column.table = this;
				if(column.editable){
					column = dojox.table.TextEdit(column);
				}
				var th = create("th",{
					className: classes.header,
					width: column.width || "100px"
				});
				ths.push(th);
				// allow for custom header manipulation
				if(column.renderHeaderCell){
					column.renderHeaderCell(th);
				}else if(column.name){
					th.appendChild(document.createTextNode(column.name));
				}
				tr.appendChild(th);
				if(column.sortable){
					// if it is sortable, resort on clicks
					(function(field){
						dojo.connect(th, "click", function(){
							// resort
							var descending = table.sortOrder && table.sortOrder[0].attribute == field && !table.sortOrder[0].descending; 
							table.sort(field, descending);
						});
					})(column.field);
				}
			}
			var th = create("th",{
				width: "20px"
			});
			tr.appendChild(th);
			this.headerNode.appendChild(tr);
		},
		renderColumnSizing: function(){
			// this setups a header row in the main content area to control column sizing
			var sizingTr = create("tr",{
				style:{
					height: "0px"
				}
			});
			
			for(var i = 0, l = this.structure.length; i < l; i++){
				var column = this.structure[i];
				var th = create("th",{
					width: column.width || "100px"
				});
				sizingTr.appendChild(th);
			}
			this.contentNode.appendChild(sizingTr);
		},
		getRowNode: function(objectOrId){
			// summary:
			//		Get the row node for an object or id
			if(typeof objectOrId == "object"){
				objectOrId = this.store.getIdentity(objectOrId);
			}
			return dojo.byId(this.id + "-row-" + objectOrId);
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
})();
