define([
	"dojo/_base/lang",
	"./createSyncStore"
], function(lang, createSyncStore){
	function calculateOrder(store, object, before, orderField){
		// Calculates proper value of order for an item to be placed before another
		var afterOrder, beforeOrder = 0;
		if (!orderField) { orderField = "order"; }

		if(before){
			// calculate midpoint between two items' orders to fit this one
			afterOrder = before[orderField];
			store.forEach(function(object){
				var ord = object[orderField];
				if(ord > beforeOrder && ord < afterOrder){
					beforeOrder = ord;
				}
			});
			return (afterOrder + beforeOrder) / 2;
		}else{
			// find maximum order and place this one after it
			afterOrder = 0;
			store.forEach(function(object){
				var ord = object[orderField];
				if(ord > afterOrder){ afterOrder = ord; }
			});
			return afterOrder + 1;
		}
	}

	return function createOrderedStore(kwArgs){
		// Instantiate a Memory store modified to support ordering.

		kwArgs = lang.mixin({
			// Memory's add does not need to be augmented since it calls put
			copy: function(object, options){
				// summary:
				//		Given an item already in the store, creates a copy of it.
				//		(i.e., shallow-clones the item sans id, then calls add)
				var k, obj = {}, id, idprop = this.idProperty, i = 0;
				for (k in object){
					obj[k] = object[k];
				}
				// Ensure unique ID.
				// NOTE: this works for this example (where id's are strings);
				// Memory should autogenerate random numeric IDs, but
				// something seems to be falling through the cracks currently...
				id = object[idprop];
				if(id in this.index){
					// rev id
					while(this.index[id + "(" + (++i) + ")"]){}
					obj[idprop] = id + "(" + i + ")";
				}
				this.add(obj, options);
			}
		}, kwArgs);

		var store = createSyncStore(kwArgs);

		var originalPut = store.put;
		store.put = function(object, options){
			object.order = calculateOrder(this, object, options && options.before);
			return originalPut.call(this, object, options);
		};

		var sortedCollection = store.sort("order");
		lang.mixin(store, {
			sorted: sortedCollection.sorted,
			queryer: sortedCollection.queryer,
			data: sortedCollection.data
		});

		return store;
	};
});
