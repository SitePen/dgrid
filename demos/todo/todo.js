define([
	"dgrid/OnDemandGrid",
	"dgrid/Selection",
	"dgrid/editor",
	"dgrid/extensions/DnD",
	"dojo/_base/declare",
	"dojo/json",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"put-selector/put",
	"dojo/domReady!"
], function(Grid, Selection, editor, DnD, declare, json, Memory, Observable, put){
	// Create DOM
	var container = put("div#container"),
		itemForm = put(container, "form#itemForm.actionArea.topArea"),
		taskField = put(itemForm, "input#txtTask[name=task]"),
		submitButton = put(itemForm, "button[type=submit]", "Add"),
		listNode = put(container, "div#list"),
		removeArea = put(container, "div.actionArea.bottomArea"),
		removeSelectedButton = put(removeArea, "button[type=button]", "Remove Selected"),
		removeCompletedButton = put(removeArea, "button[type=button]", "Remove Completed");
	put(document.body, container);
	
	// function used to support ordered insertion of store items
	function calculateOrder(store, object, before, orderField){
		// Calculates proper value of order for an item to be placed before another
		var afterOrder, beforeOrder = 0;
		if (!orderField) { orderField = "order"; }
		
		if(before){
			// calculate midpoint between two items' orders to fit this one
			afterOrder = before[orderField];
			store.query({}, {}).forEach(function(object){
				var ord = object[orderField];
				if(ord > beforeOrder && ord < afterOrder){
					beforeOrder = ord;
				}
			});
			return (afterOrder + beforeOrder) / 2;
		}else{
			// find maximum order and place this one after it
			afterOrder = 0;
			store.query({}, {}).forEach(function(object){
				var ord = object[orderField];
				if(ord > afterOrder){ afterOrder = ord; }
			});
			return afterOrder + 1;
		}
	}
	
	// Augment Memory store to support ordering, and to
	// persist to localStorage if the browser supports it.
	var key = "dgrid_demo_todo_list",
		OrderedStoreMixin = declare(null, {
			put: function(object, options){
				// honor order if present
				options = options || {};
				if(options.before !== undefined || !object.order){
					// if options.before is provided or this item doesn't have any order,
					// calculate a new one
					object.order = calculateOrder(this, object, options.before);
				}
				return this.inherited(arguments);
			},
			query: function(query, options){
				// sort by order field
				options = options || {};
				options.sort = [{ attribute: "order" }];
				return this.inherited(arguments);
			}
		}),
		storeMixins = [Memory, OrderedStoreMixin];
	
	if (window.localStorage){
		// add functionality for saving/recalling from localStorage
		storeMixins.push(declare(null, {
			constructor: function(){
				var jsondata = localStorage[key];
				jsondata && this.setData(json.parse(jsondata));
			},
			put: function(object, options){
				// persist new/updated item to localStorage
				var r = this.inherited(arguments);
				localStorage[key] = json.stringify(this.data);
				return r;
			},
			remove: function(id){
				// update localStorage to reflect removed item
				var r = this.inherited(arguments);
				localStorage[key] = json.stringify(this.data);
				return r;
			}
		}));
	}
	var Store = declare(storeMixins),
		store = Observable(new Store({ idProperty: "summary" })),
		grid = new (declare([Grid, Selection, DnD]))({
			sort: "order",
			store: store,
			columns: {
				completed: editor({
					label: " ",
					autoSave: true,
					sortable: false
				}, "checkbox"),
				summary: {
					field: "_item", // get whole item for use by formatter
					label: "TODOs",
					sortable: false,
					formatter: function(item){
						return "<div" + (item.completed ? ' class="completed"' : "") +
							">" + item.summary + "</div>";
					}
				}
			}
		}, listNode);
	
	grid.sort("order");
	
	itemForm.onsubmit = function(){
		// allow overwrite if already exists (by using put, not add)
		store.put({
			completed: false,
			summary: taskField.value
		});
		taskField.value = "";
		return false;
	};
	removeSelectedButton.onclick = function(){
		for (var i in grid.selection) {
			// Each key in the selection map is the id of the item,
			// so we can pass it directly to store.remove.
			store.remove(i);
		}
	};
	removeCompletedButton.onclick = function(){
		// query for all completed items and remove them
		store.query({ completed: true }).forEach(function(item){
			store.remove(item[store.idProperty]);
		});
	};
	
	if(window.localStorage){
		// add extra button to clear the localStorage key we're using
		var button = put(removeArea, "button[type=button]",
			"Clear localStorage");
		button.onclick = function(){
			localStorage.removeItem(key);
			// remove all items in grid the quick way (no need to iteratively remove)
			store.setData([]);
			grid.refresh();
		};
	}
});