define(["dojo/_base/declare","dijit/registry"],
function(declare, registry){
/*
 *	Dijit registry extension for dgrid
 */
	return declare([], {
		// summary:
		//		A dgrid extension which will add the grid to the dijit registry
		//		so that startup() will be successfully called by dijit layout widgets
		//		with dgrid children via registry.add(this).
		
		buildRendering: function(){
			registry.add(this);
			this.inherited(arguments);
			// Note: for dojo 2.0 may rename widgetId to dojo._scopeName + "_widgetId"
			this.domNode.setAttribute("widgetId", this.id);
		},
		
		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			
			// if parent is a widget, assume it will handle resize events, and
			// remove the window resize listener added by List
			if(registry.getEnclosingWidget(this.domNode.parentNode)){
				this._resizeHandle.remove();
			}
		},
		
		destroy: function(){
			this.inherited(arguments);
			registry.remove(this);
		},
		
		getChildren: function(){
			// provide hollow implementation for logic which assumes its existence
			// (e.g. dijit/form/_FormMixin)
			// TODO: maybe it's desirable (but expensive) to call findWidgets here?
			return [];
		}
	});
});