define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/on", "dojo/aspect", "put-selector/put"],
function(declare, lang, Deferred, listen, aspect, put){
	// This module isolates the base logic required by store-aware list/grid
	// components, e.g. OnDemandList/Grid and the Pagination extension.
	
	// Noop function, needed for _trackError when callback due to a bug in 1.8
	// (see http://bugs.dojotoolkit.org/ticket/16667)
	function noop(value){ return value; }
	
	function emitError(err){
		// called by _trackError in context of list/grid, if an error is encountered
		if(typeof err !== "object"){
			// Ensure we actually have an error object, so we can attach a reference.
			err = new Error(err);
		}else if(err.dojoType === "cancel"){
			// Don't fire dgrid-error events for errors due to canceled requests
			// (unfortunately, the Deferred instrumentation will still log them)
			return;
		}
		// TODO: remove this @ 0.4 (prefer grid property directly on event object)
		err.grid = this;
		
		if(listen.emit(this.domNode, "dgrid-error", {
				grid: this,
				error: err,
				cancelable: true,
				bubbles: true })){
			console.error(err);
		}
	}
	
	return declare(null, {
		// store: Object
		//		The object store (implementing the dojo/store API) from which data is
		//		to be fetched.
		store: null,
		
		// query: Object
		//		Specifies query parameter(s) to pass to store.query calls.
		query: null,
		
		// queryOptions: Object
		//		Specifies additional query options to mix in when calling store.query;
		//		sort, start, and count are already handled.
		queryOptions: null,
		
		// getBeforePut: boolean
		//		If true, a get request will be performed to the store before each put
		//		as a baseline when saving; otherwise, existing row data will be used.
		getBeforePut: true,
		
		// noDataMessage: String
		//		Message to be displayed when no results exist for a query, whether at
		//		the time of the initial query or upon subsequent observed changes.
		//		Defined by _StoreMixin, but to be implemented by subclasses.
		noDataMessage: "",
		
		// loadingMessage: String
		//		Message displayed when data is loading.
		//		Defined by _StoreMixin, but to be implemented by subclasses.
		loadingMessage: "",
		
		constructor: function(){
			// Create empty objects on each instance, not the prototype
			this.query = {};
			this.queryOptions = {};
			this.dirty = {};
			this._updating = {}; // Tracks rows that are mid-update
			this._columnsWithSet = {};
			this._observers = [];
			this._numObservers = 0;

			// Reset _columnsWithSet whenever column configuration is reset
			aspect.before(this, "configStructure", lang.hitch(this, function(){
				this._columnsWithSet = {};
			}));
		},
		
		postCreate: function(){
			this.inherited(arguments);
			if(this.store){
				this._updateNotifyHandle(this.store);
			}
		},
		
		destroy: function(){
			this.inherited(arguments);
			if(this._notifyHandle){
				this._notifyHandle.remove();
			}
		},
		
		_configColumn: function(column){
			// summary:
			//		Implements extension point provided by Grid to store references to
			//		any columns with `set` methods, for use during `save`.
			if (column.set){
				this._columnsWithSet[column.field] = column;
			}
		},
		
		_updateNotifyHandle: function(store){
			// summary:
			//		Unhooks any previously-existing store.notify handle, and
			//		hooks up a new one for the given store.
			
			if(this._notifyHandle){
				// Unhook notify handler from previous store
				this._notifyHandle.remove();
				delete this._notifyHandle;
			}
			if(store && typeof store.notify === "function"){
				this._notifyHandle = aspect.after(store, "notify",
					lang.hitch(this, "_onNotify"), true);
			}
		},
		
		_setStore: function(store, query, queryOptions){
			// summary:
			//		Assigns a new store (and optionally query/queryOptions) to the list,
			//		and tells it to refresh.
			
			this._updateNotifyHandle(store);
			
			this.store = store;
			this.dirty = {}; // discard dirty map, as it applied to a previous store
			this.set("query", query, queryOptions);
		},
		_setQuery: function(query, queryOptions){
			// summary:
			//		Assigns a new query (and optionally queryOptions) to the list,
			//		and tells it to refresh.
			
			var sort = queryOptions && queryOptions.sort;
			
			this.query = query !== undefined ? query : this.query;
			this.queryOptions = queryOptions || this.queryOptions;
			
			// If we have new sort criteria, pass them through the sort setter
			// (which call refresh in itself).  Otherwise, just refresh.
			sort ? this.set("sort", sort) : this.refresh();
		},
		
		_getQueryOptions: function(){
			// summary:
			//		Get a fresh queryOptions object, also including the current sort
			var options = lang.delegate(this.queryOptions, {});
			if(this.sort.length){
				// Prevents SimpleQueryEngine from doing unnecessary "null" sorts (which can
				// change the ordering in browsers that don't use a stable sort algorithm, eg Chrome)
				options.sort = this.sort;
			}
			return options;
		},
		_getQuery: function(){
			// summary:
			//		Implemented consistent with _getQueryOptions so that if query is
			//		an object, this returns a protected (delegated) object instead of
			//		the original.
			var q = this.query;
			return typeof q == "object" && q != null ? lang.delegate(q, {}) : q;
		},
		
		_setSort: function(property, descending){
			// summary:
			//		Sort the content
			
			// prevent default storeless sort logic as long as we have a store
			if(this.store){ this._lastCollection = null; }
			this.inherited(arguments);
		},
		
		_onNotify: function(object, existingId){
			// summary:
			//		Method called when the store's notify method is called.
			
			// Call inherited in case anything was mixed in earlier
			this.inherited(arguments);
			
			// For adds/puts, check whether any observers are hooked up;
			// if not, force a refresh to properly hook one up now that there is data
			if(object && this._numObservers < 1){
				this.refresh({ keepScrollPosition: true });
			}
		},
		
		row: function(target){
			// Extend List#row with more appropriate lookup-by-id logic
			var row = this.inherited(arguments);
			if(row && row.data && typeof row.id !== "undefined"){
				row.id = this.store.getIdentity(row.data);
			}
			return row;
		},
		
		insertRow: function(object, parent, beforeNode, i, options){
			var store = this.store,
				dirty = this.dirty,
				id = store && store.getIdentity(object),
				dirtyObj;
			
			if(id in dirty && !(id in this._updating)){ dirtyObj = dirty[id]; }
			if(dirtyObj){
				// restore dirty object as delegate on top of original object,
				// to provide protection for subsequent changes as well
				object = lang.delegate(object, dirtyObj);
			}
			return this.inherited(arguments);
		},
		
		updateDirty: function(id, field, value){
			// summary:
			//		Updates dirty data of a field for the item with the specified ID.
			var dirty = this.dirty,
				dirtyObj = dirty[id];
			
			if(!dirtyObj){
				dirtyObj = dirty[id] = {};
			}
			dirtyObj[field] = value;
		},
		
		save: function() {
			// Keep track of the store and puts
			var self = this,
				store = this.store,
				dirty = this.dirty,
				dfd = new Deferred(), promise = dfd.promise,
				getFunc = function(id){
					// returns a function to pass as a step in the promise chain,
					// with the id variable closured
					var data;
					return (self.getBeforePut || !(data = self.row(id).data)) ?
						function(){ return store.get(id); } :
						function(){ return data; };
				};
			
			// function called within loop to generate a function for putting an item
			function putter(id, dirtyObj) {
				// Return a function handler
				return function(object) {
					var colsWithSet = self._columnsWithSet,
						updating = self._updating,
						key, data;

					if (typeof object.set === "function") {
						object.set(dirtyObj);
					} else {
						// Copy dirty props to the original, applying setters if applicable
						for(key in dirtyObj){
							object[key] = dirtyObj[key];
						}
					}

					// Apply any set methods in column definitions.
					// Note that while in the most common cases column.set is intended
					// to return transformed data for the key in question, it is also
					// possible to directly modify the object to be saved.
					for(key in colsWithSet){
						data = colsWithSet[key].set(object);
						if(data !== undefined){ object[key] = data; }
					}
					
					updating[id] = true;
					// Put it in the store, returning the result/promise
					return Deferred.when(store.put(object), function() {
						// Clear the item now that it's been confirmed updated
						delete dirty[id];
						delete updating[id];
					});
				};
			}
			
			// For every dirty item, grab the ID
			for(var id in dirty) {
				// Create put function to handle the saving of the the item
				var put = putter(id, dirty[id]);
				
				// Add this item onto the promise chain,
				// getting the item from the store first if desired.
				promise = promise.then(getFunc(id)).then(put);
			}
			
			// Kick off and return the promise representing all applicable get/put ops.
			// If the success callback is fired, all operations succeeded; otherwise,
			// save will stop at the first error it encounters.
			dfd.resolve();
			return promise;
		},
		
		revert: function(){
			// summary:
			//		Reverts any changes since the previous save.
			this.dirty = {};
			this.refresh();
		},
		
		_trackError: function(func){
			// summary:
			//		Utility function to handle emitting of error events.
			// func: Function|String
			//		A function which performs some store operation, or a String identifying
			//		a function to be invoked (sans arguments) hitched against the instance.
			//		If sync, it can return a value, but may throw an error on failure.
			//		If async, it should return a promise, which would fire the error
			//		callback on failure.
			// tags:
			//		protected
			
			var result;
			
			if(typeof func == "string"){ func = lang.hitch(this, func); }
			
			try{
				result = func();
			}catch(err){
				// report sync error
				emitError.call(this, err);
			}
			
			// wrap in when call to handle reporting of potential async error
			return Deferred.when(result, noop, lang.hitch(this, emitError));
		},
		
		newRow: function(){
			// Override to remove no data message when a new row appears.
			// Run inherited logic first to prevent confusion due to noDataNode
			// no longer being present as a sibling.
			var row = this.inherited(arguments);
			if(this.noDataNode){
				put(this.noDataNode, "!");
				delete this.noDataNode;
			}
			return row;
		},
		removeRow: function(rowElement, justCleanup){
			var row = {element: rowElement};
			// Check to see if we are now empty...
			if(!justCleanup && this.noDataMessage &&
					(this.up(row).element === rowElement) &&
					(this.down(row).element === rowElement)){
				// ...we are empty, so show the no data message.
				this.noDataNode = put(this.contentNode, "div.dgrid-no-data");
				this.noDataNode.innerHTML = this.noDataMessage;
			}
			return this.inherited(arguments);
		},
		
		cleanup: function(){
			var observers = this._observers,
				observer;
			
			this.inherited(arguments);
			
			// Remove any store observers
			for(i = 0; i < observers.length; i++){
				observer = observers[i];
				if(observer){
					observer.cancel();
				}
			}
			this._observers = [];
			this._numObservers = 0;
		},
		
		renderQueryResults: function(results, beforeNode, options){
			// summary:
			//		Renders objects from QueryResults as rows, before the given node.
			//		This will listen for changes in the collection if an observe method
			//		is available (i.e. from an Observable data store).
			
			options = options || {};
			var self = this,
				start = options.start || 0,
				observer,
				rows,
				container,
				observerIndex;
			
			if(results.observe){
				observer = results.observe(function(object, from, to){
					var row, firstRow, nextNode, parentNode;
					
					function advanceNext() {
						nextNode = (nextNode.connected || nextNode).nextSibling;
					}
					
					// a change in the data took place
					if(from > -1 && rows[from]){
						// remove from old slot
						row = rows.splice(from, 1)[0];
						// check to make the sure the node is still there before we try to remove it, (in case it was moved to a different place in the DOM)
						if(row.parentNode == container){
							firstRow = row.nextSibling;
							if(firstRow){ // it's possible for this to have been already removed if it is in overlapping query results
								if(from != to){ // if from and to are identical, it is an in-place update and we don't want to alter the rowIndex at all
									firstRow.rowIndex--; // adjust the rowIndex so adjustRowIndices has the right starting point
								}
							}
							self.removeRow(row); // now remove
						}
						// the removal of rows could cause us to need to page in more items
						if(self._processScroll){
							self._processScroll();
						}
					}
					if(to > -1){
						// Add to new slot (either before an existing row, or at the end)
						// First determine the DOM node that this should be placed before.
						if(rows.length){
							nextNode = rows[to];
							if(!nextNode){
								nextNode = rows[to - 1];
								if(nextNode){
									// Make sure to skip connected nodes, so we don't accidentally
									// insert a row in between a parent and its children.
									advanceNext();
								}
							}
						}else{
							// There are no rows.  Allow for subclasses to insert new rows somewhere other than
							// at the end of the parent node.
							nextNode = self._getFirstRowSibling && self._getFirstRowSibling(container);
						}
						// Make sure we don't trip over a stale reference to a
						// node that was removed, or try to place a node before
						// itself (due to overlapped queries)
						if(row && nextNode && row.id === nextNode.id){
							advanceNext();
						}
						if(nextNode && !nextNode.parentNode){
							nextNode = byId(nextNode.id);
						}
						parentNode = (beforeNode && beforeNode.parentNode) ||
							(nextNode && nextNode.parentNode) || self.contentNode;
						row = self.newRow(object, parentNode, nextNode, options.start + to, options);
						
						if(row){
							row.observerIndex = observerIndex;
							rows.splice(to, 0, row);
							if(!firstRow || to < from){
								// the inserted row is first, so we update firstRow to point to it
								var previous = row.previousSibling;
								// if we are not in sync with the previous row, roll the firstRow back one so adjustRowIndices can sync everything back up.
								firstRow = !previous || previous.rowIndex + 1 == row.rowIndex || row.rowIndex == 0 ?
									row : previous;
							}
						}
						options.count++;
					}
					from != to && firstRow && self.adjustRowIndices(firstRow);
					self._onNotification(rows, object, from, to);
				}, true);
			}
			
			// Render the results, asynchronously or synchronously
			return Deferred.when(results, function(resolvedResults){
				var resolvedRows,
					i;
				
				container = beforeNode ? beforeNode.parentNode : self.contentNode;
				if(container && container.parentNode &&
						(container !== self.contentNode || resolvedResults.length)){
					resolvedRows = self.renderArray(resolvedResults, beforeNode, options);
					i = resolvedRows.length;
					
					delete self._lastCollection; // used only for non-store List/Grid
					
					if(observer){
						// Push observer since it will actually be used
						observerIndex = self._observers.push(observer) - 1;
						self._numObservers++;
						while(i--){
							resolvedRows[i].observerIndex = observerIndex;
						}
					}
				}else{
					// Don't bother inserting; rows are already out of view
					// or there were none to track
					resolvedRows = [];
				}
				return (rows = resolvedRows);
			});
		},
		
		_onNotification: function(rows, object, from, to){
			// summary:
			//		Protected method called whenever a store notification is observed.
			//		Intended to be extended as necessary by mixins/extensions.
		}
	});
});
