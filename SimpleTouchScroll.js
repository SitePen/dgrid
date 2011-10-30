define(["dojo/_base/declare", "dojo/on"],
function(declare, on){
	var startPos, // records coords of touchstart
		touches = 0; // records number of touches on document
	
	function updatetouchcount(evt){
		touches = evt.touches.length;
	}
	
	function ontouchstart(evt){
		var t;
		// check "global" touches count (which hasn't counted this touch yet)
		if(touches > 0){ return; } // ignore multitouch gestures
		
		t = evt.touches[0];
		startPos = [this.scrollLeft + t.pageX, this.scrollTop + t.pageY];
	}
	function ontouchmove(evt){
		var t;
		if(touches > 1){ return; } // ignore multitouch gestures
		
		t = evt.touches[0];
		// snuff event and scroll the area
		evt.preventDefault();
		evt.stopPropagation();
		this.scrollLeft = startPos[0] - t.pageX;
		this.scrollTop = startPos[1] - t.pageY;
	}
	
	// hook up touch listeners to entire body to track number of active touches
	on(document.body, "touchstart,touchend,touchcancel", updatetouchcount);
	
	return declare([], {
		startup: function(){
			var node = this.touchNode || this.domNode;
			on(node, "touchstart", ontouchstart);
			on(node, "touchmove", ontouchmove);
		}
	});
});