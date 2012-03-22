define(["dojo/_base/declare", "dojo/on"],
function(declare, on){
	var
		bodyTouchListener, // stores handle to body touch handler once connected
		timerRes = 15, // ms between drag velocity measurements and animation "ticks"
		touches = 0, // records number of touches on document
		current = {}, // records info for widget currently being scrolled
		glide = {}, // records info for widgets that are in "gliding" state
		glideThreshold = 1; // speed (in px) below which to stop glide
	
	function updatetouchcount(evt){
		touches = evt.touches.length;
	}
	
	// functions for handling touch events on node to be scrolled
	
	function ontouchstart(evt){
		var t, id = evt.widget.id, g = glide[id];
		
		// stop any active glide on this widget since it's been re-touched
		if(g){
			clearTimeout(g.timer);
			delete glide[id];
		}
		
		// check "global" touches count (which hasn't counted this touch yet)
		if(touches > 0){ return; } // ignore multitouch gestures
		
		t = evt.touches[0];
		current = {
			widget: evt.widget,
			node: this,
			startX: this.scrollLeft + t.pageX,
			startY: this.scrollTop + t.pageY,
			timer: setTimeout(calcTick, timerRes)
		};
	}
	function ontouchmove(evt){
		var t;
		if(touches > 1 || !current){ return; } // ignore multitouch gestures
		
		t = evt.touches[0];
		// snuff event and scroll the area
		evt.preventDefault();
		evt.stopPropagation();
		this.scrollLeft = current.startX - t.pageX;
		this.scrollTop = current.startY - t.pageY;
	}
	function ontouchend(evt){
		if(touches != 1 || !current){ return; }
		current.timer && clearTimeout(current.timer);
		startGlide(current);
		current = null;
	}
	
	// glide-related functions
	
	function calcTick(){
		// Calculates current speed of touch drag
		var node, x, y;
		if(!current){ return; } // no currently-scrolling widget; abort
		
		node = current.node;
		x = node.scrollLeft;
		y = node.scrollTop;
		
		if("prevX" in current){
			// calculate velocity using previous reference point
			current.velX = x - current.prevX;
			current.velY = y - current.prevY;
		}
		// set previous reference point for next iteration
		current.prevX = x;
		current.prevY = y;
		current.timer = setTimeout(calcTick, timerRes);
	}
	
	function startGlide(info){
		// starts glide operation when drag ends
		var id = info.widget.id, g;
		if(!info.velX && !info.velY){ return; } // no glide to perform
		
		g = glide[id] = info; // reuse object for widget/node/vel properties
		g.calcFunc = function(){ calcGlide(id); }
		g.timer = setTimeout(g.calcFunc, timerRes);
	}
	function calcGlide(id){
		// performs glide and decelerates according to widget's glideDecel method
		var g = glide[id], x, y, node, widget,
			vx, vy, nvx, nvy; // old and new velocities
		
		if(!g){ return; }
		
		node = g.node;
		widget = g.widget;
		x = node.scrollLeft;
		y = node.scrollTop;
		vx = g.velX;
		vy = g.velY;
		nvx = widget.glideDecel(vx);
		nvy = widget.glideDecel(vy);
		
		if(Math.abs(nvx) >= glideThreshold || Math.abs(nvy) >= glideThreshold){
			// still above stop threshold; update scroll positions
			node.scrollLeft += nvx;
			node.scrollTop += nvy;
			if(node.scrollLeft != x || node.scrollTop != y){
				// still scrollable; update velocities and schedule next tick
				g.velX = nvx;
				g.velY = nvy;
				g.timer = setTimeout(g.calcFunc, timerRes);
			}
		}
	}
	
	return declare([], {
		startup: function(){
			var node = this.touchNode || this.containerNode || this.domNode,
				widget = this;
			on(node, "touchstart", function(evt){
				evt.widget = widget;
				ontouchstart.call(this, evt);
			});
			on(node, "touchmove", ontouchmove);
			on(node, "touchend,touchcancel", ontouchend);
			
			if(!bodyTouchListener){
				// first time: hook up touch listeners to entire body,
				// to track number of active touches
				bodyTouchListener = on(document.body,
					"touchstart,touchend,touchcancel", updatetouchcount);
			}
		},
		glideDecel: function(n){
			// summary:
			//		Deceleration algorithm. Given a number representing velocity,
			//		returns a new velocity to impose for the next "tick".
			//		(Don't forget that velocity can be positive or negative!)
			return n * 0.9; // Number
		}
	});
});