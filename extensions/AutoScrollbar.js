define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/has", "dojo/aspect", "put-selector/put", 
	"../util/misc"], 
function(declare, lang, Deferred, has, aspect, put, misc){
	return declare(null, {
		// summary:
		//    When used within a Dijit layout widget, automatically displays and hides the vertical scrollbar as needed.
		//    It is recommended that lists/grids that use this extension also use the DijitRegistry plugin.
		
		/** The last size we were asked to be by our container */
		_lastSize: null, 
		
		postscript: function(){
			var self = this,
				// We may get many row additions/removals in a short period of time
				throttledCheckScrollbars = misc.throttleCombined(function(){ 
					self._checkScrollbars();
					if(has("ie") == 6){ setTimeout(function(){ self.resize(); }); }
				});
			
			// Normally we need to check the scrollbars *before* the normal resize code happens, but on startup we 
			// need the resize code to set the grid up for us so we can work out the preferred size. Thus we set up
			// a one-off notification, and from there install the rest of our listeners
			var afterResize = aspect.after(this, "resize", function(currentSize){
				afterResize.remove();
				throttledCheckScrollbars();
				
				aspect.after(this, "resize", misc.throttleCombined(this._checkScrollbars, this, null, true), true);
				aspect.after(this, "renderArray", function(rows){
					// Only check the scrollbars after the rows have been rendered
					Deferred.when(rows, throttledCheckScrollbars);
					return rows;
				});
				aspect.after(this, "newRow", throttledCheckScrollbars, true);
				aspect.after(this, "removeRow", throttledCheckScrollbars, true);
			}, true);
			
			this.inherited(arguments);
		},
		
		_checkScrollbars: function(currentSize){
			if(!currentSize){
				// If we've come in from an entry point other than resize(), we will not be given currentSize
				currentSize = this._lastSize;	
			}
			// Give up if we don't know what size we're supposed to be; if we're within a layout widget eventually we
			// should get a call with currentSize defined
			if(currentSize){
				var 
					contentNode = this.contentNode, 
					contentNodeHeight = contentNode.style.height,
					bodyNode = this.bodyNode,
					bodyNodeHeight = bodyNode.style.height,
					scrollTop = bodyNode.scrollTop;
	
				// "Free" its height so we can measure its natural size
				contentNode.style.height = "auto";
				
				// Add/remove the vertical scrollbar as needed
				if(currentSize.h < this.headerNode.offsetHeight + contentNode.offsetHeight + this.footerNode.offsetHeight){
					put(this.domNode, "!dgrid-autoheight");
					this.domNode.style.height = Math.max(1, currentSize.h) + "px";
				}else{
					put(this.domNode, ".dgrid-autoheight");
					this.domNode.style.height = "";
				}
				
				// Remember this so that calls from renderArray()/newRow()/removeRow() know the last requested size
				this._lastSize = currentSize;
				
				// We changed this in order to measure the correct height	
				contentNode.style.height = contentNodeHeight;
				// Restore the scrollbar position to stop it jumping to the top
				this.bodyNode.scrollTop = scrollTop;
				
				if(has("ie") == 6 && bodyNodeHeight.indexOf("px") != -1 && bodyNodeHeight != bodyNode.clientHeight + "px"){
					this.resize();
				}
			}
		}
	});
});