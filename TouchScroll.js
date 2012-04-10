define(["dojo/_base/declare", "dojo/on", "dojo/has", "put-selector/put"],
function(declare, on, has, put){
	var userAgent = navigator.userAgent;
	// have you some sniffing to guess if it has touch scrolling and accelerated transforms
	has.add("touch-scrolling", document.documentElement.style.WebkitOverflowScrolling !== undefined || parseFloat(userAgent.split("Android ")[1]) >= 4);
	has.add("accelerated-transform", !!userAgent.match(/like Mac/));
	var
		bodyTouchListener, // stores handle to body touch handler once connected
		timerRes = 25, // ms between drag velocity measurements and animation "ticks"
		touches = 0, // records number of touches on document
		current = {}, // records info for widget currently being scrolled
		glide = {}, // records info for widgets that are in "gliding" state
		glideThreshold = 0.021; // speed (in px) below which to stop glide
	
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
		
		if(!this.scrollbarYNode && !has("touch-scrolling")){
			var scrollbarYNode = this.scrollbarYNode = put(this.parentNode, "div.dgrid-touch-scrollbar-y");
			scrollbarYNode.style.height = this.offsetHeight * this.offsetHeight  / this.scrollHeight + "px";  
		}
		t = evt.touches[0];
		current = {
			widget: evt.widget,
			node: this,
			startX: this.scrollLeft + t.pageX,
			startY: this.scrollTop + t.pageY
		};
	}
	function ontouchmove(evt){
		var t;
		if(touches > 1 || !current){ return; } // ignore multitouch gestures
		
		t = evt.touches[0];
		// snuff event and scroll the area
		if(!has("touch-scrolling")){
			evt.preventDefault();
			evt.stopPropagation();
		}		
		scroll(this, current.startX - t.pageX, current.startY - t.pageY);
		calcVelocity();
	}
	function ontouchend(evt){
		if(touches != 1 || !current){ return; }
		startGlide(current);
		current = null;
	}

	function scroll(node, x, y){
		// do the actual scrolling
		var hasTouchScrolling = has("touch-scrolling");
		x = Math.min(Math.max(0, x), node.scrollWidth - node.offsetWidth);
		y = Math.min(Math.max(0, y), node.scrollHeight - node.offsetHeight);
		if(!hasTouchScrolling && has("accelerated-transform")){
			// we have hardward acceleration of transforms, so we will do the fast scrolling
			// by setting the transform style with a translate3d
			var transformNode = node.firstChild;
			var lastScrollLeft = node.scrollLeft;
			var lastScrollTop = node.scrollTop;
			// store the current scroll position
			node.instantScrollLeft = x;
			node.instantScrollTop = y;
			// set the style transform
			transformNode.style.WebkitTransform = "translate3d(" + (node.scrollLeft - x) + "px," 
				+ (node.scrollTop - y) + "px,0)";
			// now every half a second actually update the scroll position so that the scroll
			// monitors (like OnDemandList) receive events and scroll positions to work with
			if(!node._scrollWaiting){
				node._scrollWaiting = true;
				setTimeout(function(){
					node._scrollWaiting = false;
					// reset the transform since we are updating the actual scroll position
					transformNode.style.WebkitTransform = "translate3d(0,0,0)";
					// get the latest effective scroll position
					node.scrollLeft = node.instantScrollLeft;
					node.scrollTop = node.instantScrollTop;
					// reset these so they aren't used anymore
					node.instantScrollLeft = 0;
					node.instantScrollTop = 0;
				}, 500);
			}
		}else{
			// update scroll position immediately (note we may be using browser's touch scroll
			var scrollPrefix = hasTouchScrolling ? "instantScroll" : "scroll";
			node[scrollPrefix + "Left"] = x;
			node[scrollPrefix + "Top"] = y;
			if(hasTouchScrolling){
				// if we are using browser's touch scroll, we fire our own scroll events
				on.emit(node, "touch-scroll", {});
			}	
		}
		node.scrollbarYNode.style.top = (y * node.offsetHeight / node.scrollHeight + node.offsetTop) + "px";
	}	
	// glide-related functions
	
	function calcVelocity(){
		// Calculates current speed of touch drag
		var node, x, y, now;
		if(!current){ return; } // no currently-scrolling widget; abort
		
		node = current.node;
		x = node.instantScrollLeft || node.scrollLeft;
		y = node.instantScrollTop || node.scrollTop;
		now = new Date().getTime();
		
		if("prevX" in current){
			// calculate velocity using previous reference point
			var duration = now - current.prevTime;
			current.velX = (x - current.prevX) / duration;
			current.velY = (y - current.prevY) / duration;
			
		}
		if(!(current.prevTime - now > -150)){ // make sure it is far enough back that we can get a good estimate
			// set previous reference point for next iteration
			current.prevX = x;
			current.prevY = y;
			current.prevTime = now;
		}
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
		// we use instantScroll... so that OnDemandList has something to pull from to get the current value (needed for ios5 with touch scrolling) 
		x = node.instantScrollLeft || node.scrollLeft;
		y = node.instantScrollTop || node.scrollTop;
		vx = g.velX;
		vy = g.velY;
		nvx = widget.glideDecel(vx);
		nvy = widget.glideDecel(vy);
		
		if(Math.abs(nvx) >= glideThreshold || Math.abs(nvy) >= glideThreshold){
			// still above stop threshold; update scroll positions
			scroll(node, x + nvx / timerRes * 1000, y + nvy / timerRes * 1000);
			if((node.instantScrollLeft || node.scrollLeft) != x || (node.instantScrollTop || node.scrollTop) != y){
				// still scrollable; update velocities and schedule next tick
				g.velX = nvx;
				g.velY = nvy;
				g.timer = setTimeout(g.calcFunc, timerRes);
			}
		}
	}
	
	return declare([], {
		pagingDelay: 500,
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
			return n + (n > 0 ? -0.02 : 0.02); // Number
		}
	});
});