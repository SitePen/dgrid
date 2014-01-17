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
		// collection: Object
		//		The object collection (implementing the dstore/api/Store API) from which data is
		//		to be fetched.
		collection: null,

		rows: null,
		
		// getBeforePut: boolean
		//		If true, a get request will be performed to the store before each put
		//		as a baseline when saving; otherwise, existing row data will be used.
		getBeforePut: true,
		
		// noDataMessage: String
		//		Message to be displayed when no results exist for a collection, whether at
		//		the time of the initial query or upon subsequent observed changes.
		//		Defined by _StoreMixin, but to be implemented by subclasses.
		noDataMessage: "",
		
		// loadingMessage: String
		//		Message displayed when data is loading.
		//		Defined by _StoreMixin, but to be implemented by subclasses.
		loadingMessage: "",
		
		constructor: function(){
			// Create empty objects on each instance, not the prototype
			this.dirty = {};
			this._updating = {}; // Tracks rows that are mid-update
			this._columnsWithSet = {};

			// Reset _columnsWithSet whenever column configuration is reset
			aspect.before(this, "configStructure", lang.hitch(this, function(){
				this._columnsWithSet = {};
			}));
		},
		
		// TODO: What should be done about specifying `collection` in the constructor kwArgs
		postscript: function(kwArgs){
			this.inherited(arguments);
			this.collection && this.set('collection', this.collection);
		},
		
		destroy: function(){
			this.inherited(arguments);

			// TODO: Remove observer if any
		},
		
		_configColumn: function(column){
			// summary:
			//		Implements extension point provided by Grid to store references to
			//		any columns with `set` methods, for use during `save`.
			if (column.set){
				this._columnsWithSet[column.field] = column;
			}
			this.inherited(arguments);
		},
		
		_setCollection: function(collection){
			// summary:
			//		Assigns a new collection to the list,
			//		and tells it to refresh.
			
			// Remove observer and existing rows so any sub-row observers will be cleaned up
			// TODO: declare _observerHandle on the prototype
			if(this._observerHandle){
				this._observerHandle.remove();
				this._observerHandle = this.rows = null;
			}
			this.cleanup();

			this.dirty = {}; // discard dirty map, as it applied to a previous collection
			
			if(collection.track){
				this.collection = collection.track();
				this.rows = [];
			
				// TODO: How is the total number of items tracked?
				this._observerHandle = this._observeCollection(this.collection, this.contentNode, this.rows);
			}else{
				this.collection = collection;
			}
			
			collection.on("refresh", lang.hitch(this, "refresh"));
			
			// If we have new sort criteria, pass them through the sort setter
			// (which call refresh in itself).  Otherwise, just refresh.
			// TODO: Are there any cases where this.sort will be truthy but we don't to set it?
			if(this.sort){
				this.set('sort', this.sort);
			}else{
				this.refresh();
			}
		},
		
		_setSort: function(property, descending){
			// summary:
			//		Sort the content
			
			// prevent default storeless sort logic as long as we have a store
			if(this.collection){ this._lastCollection = null; }
			this.inherited(arguments);
		
			if(this.sort){
				this.collection && this.collection.sort(this.sort);
			}
		},
		
		row: function(target){
			// Extend List#row with more appropriate lookup-by-id logic
			var row = this.inherited(arguments);
			if(row && row.data && typeof row.id !== "undefined"){
				row.id = this.collection.getIdentity(row.data);
			}
			return row;
		},
		
		insertRow: function(object, parent, beforeNode, i, options){
			var store = this.collection,
				dirty = this.dirty,
				id = store && store.getIdentity(object),
				dirtyObj,
				row;
			
			if(id in dirty && !(id in this._updating)){ dirtyObj = dirty[id]; }
			if(dirtyObj){
				// restore dirty object as delegate on top of original object,
				// to provide protection for subsequent changes as well
				object = lang.delegate(object, dirtyObj);
			}
			
			row = this.inherited(arguments);
			
			// Remove no data message when a new row appears.
			// Run after inherited logic to prevent confusion due to noDataNode
			// no longer being present as a sibling.
			if(this.noDataNode){
				put(this.noDataNode, "!");
				this.noDataNode = null;
			}
			
			return row;
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
				store = this.collection,
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
		
		// TODO: Add unit test for _trackError
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
			
			if(typeof func == "string"){ func = lang.hitch(this, func); }
			
			var dfd = new Deferred();
			try{
				Deferred.when(func(), dfd.resolve, dfd.reject);
			}catch(err){
				// report sync error
				dfd.reject(err);
			}
			
			var self = this;
			dfd.then(null, function(err){
				emitError.call(self, err);
			});
			return dfd.promise;
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
		
		// TODO: We probably want to rename this to renderCollection
		renderQueryResults: function(results, beforeNode, options){
			// summary:
			//		Renders objects from QueryResults as rows, before the given node.
			//		This will listen for changes in the collection if an observe method
			//		is available (i.e. from an Observable data store).
			
			options = options || {};
			var self = this,
				start = options.start || 0,
				rows = options.rows || this.rows,
				container;
			
			// Render the results, asynchronously or synchronously
			var fetch = lang.hitch(results, "fetch");
			return this._trackError(fetch).then(function(resolvedResults){
				var resolvedRows,
					i;
					
				container = beforeNode ? beforeNode.parentNode : self.contentNode;
				if(container && container.parentNode &&
						(container !== self.contentNode || resolvedResults.length)){
					resolvedRows = self.renderArray(resolvedResults, beforeNode, options);
					i = resolvedRows.length;

					if(rows){
						for (var itemIndex = 0; itemIndex < resolvedRows.length; ++itemIndex){
							rows[start + itemIndex] = resolvedRows[itemIndex];
						}
					}
					
					delete self._lastCollection; // used only for non-store List/Grid
				}else{
					// TODO: _StoreMixin shouldn't have a concept of "out of view"

					// Don't bother inserting; rows are already out of view
					// or there were none to track
					resolvedRows = [];
				}
				return resolvedRows;
			});
		},

		_observeCollection: function(collection, container, rows){
			var self = this, row;

			var handles = [
				collection.on("remove, update", function(event){
					var from = event.previousIndex;
					if(from !== undefined && rows[from]){
						// remove from old slot
						row = rows.splice(from, 1)[0];

						// adjust the rowIndex so adjustRowIndices has the right starting point
						rows[from] && rows[from].rowIndex--;

						// check to make the sure the node is still there before we try to remove it, (in case it was moved to a different place in the DOM)
						if(row.parentNode == container){
							self.removeRow(row); // now remove
						}

						// the removal of rows could cause us to need to page in more items
						if(self._processScroll){
							self._processScroll();
						}
					}
				}),

				collection.on("add, update", function(event){
					var to = event.index, nextNode;

					function advanceNext() {
						nextNode = (nextNode.connected || nextNode).nextSibling;
					}

					if(to !== undefined){
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
							nextNode = document.getElementById(nextNode.id);
						}
						// TODO: What to do about this? Is this necessary?
						//parentNode = (beforeNode && beforeNode.parentNode) ||
						//	(nextNode && nextNode.parentNode) || self.contentNode;
						// TODO: `options` is likely needed here for `tree` to function properly
						row = self.insertRow(event.target, container, nextNode, to, /*options*/ {});
						self.highlightRow(row);
						
						// TODO: When would row be falsy?
						if(row){
							rows.splice(to, 0, row);
						}
					}
				}),

				// TODO: Should the event names be the same as the store CRUD method names?
				collection.on("add, remove, update", function(event){
					var from = (typeof event.previousIndex !== "undefined") ? event.previousIndex : Infinity,
						to = (typeof event.index !== "undefined") ? event.index : Infinity,
						adjustAtIndex = Math.min(from, to);
					from !== to && rows[adjustAtIndex] && self.adjustRowIndices(rows[adjustAtIndex]);
				})
			];

			return {
				remove: function(){
					while(handles.length > 0){
						handles.pop().remove();
					}
				}
			};
		},
	});
});
