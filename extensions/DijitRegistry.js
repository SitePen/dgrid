define(["dojo/_base/declare","dijit/registry"],
function(declare, registry){
		/*
 *	dijit registry extension for dgrid
 *	v.1.0.0
 *	cbarrett 01152012
 *
 *	A dGrid extension that will add the grid to the dijit registry
 *  so that startup() will be successfully called by dijit layout widgets with
 *  dgrid children via registry.add(this).
 */
	return declare([], {
		buildRendering: function(){
			if(this.domNode){
				// Note: for dojo 2.0 may rename widgetId to dojo._scopeName + "_widgetId"
				this.domNode.setAttribute("widgetId", this.id);
			}
			registry.add(this);
			console.log("DijitRegistry create called on: ", this.id);
			this.inherited(arguments);
		},
		destroy: function(){
			registry.remove(this);
			this.inherited(arguments);
		}
	});

});