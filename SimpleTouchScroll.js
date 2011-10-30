define(["dojo/_base/declare", "dojo/on"],
function(declare, on){
	var startPos; // holds coords of touchstart
	function ontouchstart(evt){
		var t = evt.touches[0];
		startPos = [this.scrollLeft + t.pageX, this.scrollTop + t.pageY];
	}
	function ontouchmove(evt){
		var t = evt.touches[0];
		// don't interfere with multitouch gestures
		if(evt.touches.length != 1){ return; }
		// snuff event and scroll the area
		evt.preventDefault();
		evt.stopPropagation();
		this.scrollLeft = startPos[0] - t.pageX;
		this.scrollTop = startPos[1] - t.pageY;
	}
	
	return declare([], {
		startup: function(){
			var node = this.touchNode || this.domNode;
			on(node, "touchstart", ontouchstart);
			on(node, "touchmove", ontouchmove);
		}
	});
});