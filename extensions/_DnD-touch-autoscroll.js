define([
	"dojo/dom-geometry",
	"dojo/dnd/autoscroll",
	"../List"
], function(domGeometry, autoscroll, List){
	// summary:
	//		This module patches the autoScrollNodes function from the
	//		dojo/dnd/autoscroll module, in order to behave properly for
	//		dgrid TouchScroll components.
	
	var original = autoscroll.autoScrollNodes;
	
	autoscroll.autoScrollNodes = function(evt){
		var node = evt.target,
			list = List.registry.findEnclosing(node),
			pos, nodeX, nodeY, thresholdX, thresholdY, dx, dy, oldScroll, newScroll;
		
		if(list){
			// We're inside a dgrid component with TouchScroll; handle using the
			// getScrollPosition and scrollTo APIs instead of scrollTop/Left.
			// All logic here is designed to be functionally equivalent to the
			// existing logic in the original dojo/dnd/autoscroll function.
			
			node = list.touchNode.parentNode;
			pos = domGeometry.position(node, true);
			nodeX = evt.pageX - pos.x;
			nodeY = evt.pageY - pos.y;
			// Use standard threshold, unless element is too small to warrant it.
			thresholdX = Math.min(autoscroll.H_TRIGGER_AUTOSCROLL, pos.w / 2);
			thresholdY = Math.min(autoscroll.V_TRIGGER_AUTOSCROLL, pos.h / 2);
			
			// Check whether event occurred beyond threshold in any given direction.
			// If so, we will scroll by an amount equal to the calculated threshold.
			if(nodeX < thresholdX){
				dx = -thresholdX;
			}else if(nodeX > pos.w - thresholdX){
				dx = thresholdX;
			}
			
			if(nodeY < thresholdY){
				dy = -thresholdY;
			}else if(nodeY > pos.h - thresholdY){
				dy = thresholdY;
			}
			
			// Perform any warranted scrolling.
			if(dx || dy){
				oldScroll = list.getScrollPosition();
				newScroll = {};
				if(dx){ newScroll.x = oldScroll.x + dx; }
				if(dy){ newScroll.y = oldScroll.y + dy; }
				
				list.scrollTo(newScroll);
				return;
			}
		}
		// If we're not inside a dgrid component with TouchScroll, fall back to
		// the original logic to handle scroll on other elements and the document.
		original.call(this, evt);
	};
	
	return autoscroll;
});