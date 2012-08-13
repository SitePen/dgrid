define(["dojo/_base/declare", "dojo/on", "dojo/has", "put-selector/put"],
function(declare, on, has, put){
	var userAgent = navigator.userAgent;
	// have to do some sniffing to guess if it has native overflow touch scrolling and accelerated transforms
	has.add("touch-scrolling", document.documentElement.style.WebkitOverflowScrolling !== undefined || parseFloat(userAgent.split("Android ")[1]) >= 4);
	has.add("accelerated-transform", !!userAgent.match(/like Mac/));
	var
		bodyTouchListener, // stores handle to body touch handler once connected
		timerRes = 10, // ms between drag velocity measurements and animation "ticks"
		touches = 0, // records number of touches on document
		current = {}, // records info for widget currently being scrolled
		glide = {}, // records info for widgets that are in "gliding" state
		glideThreshold = 0.021; // speed (in px/ms) below which to stop glide
	
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
		if(has("touch-scrolling")){
			// reset these prior to measurements
			this.instantScrollLeft = 0;
			this.instantScrollTop = 0;
		}else{
			// if the scrolling height and width is bigger than the area, than we add scrollbars in each direction
			if(this.scrollHeight > this.offsetHeight){
				var scrollbarYNode = this.scrollbarYNode;
				if(!scrollbarYNode){
					scrollbarYNode = this.scrollbarYNode = put(this.parentNode, "div.dgrid-touch-scrollbar-y");
					scrollbarYNode.style.height = this.offsetHeight * this.offsetHeight  / this.scrollHeight + "px";
					scrollbarYNode.style.top = this.offsetTop + "px";
				}
			}
			if(this.scrollWidth > this.offsetWidth){
				var scrollbarXNode = this.scrollbarXNode;
				if(!scrollbarXNode){
					scrollbarXNode = this.scrollbarXNode = put(this.parentNode, "div.dgrid-touch-scrollbar-x");
					scrollbarXNode.style.width = this.offsetWidth * this.offsetWidth  / this.scrollWidth + "px";
					scrollbarXNode.style.left = this.offsetLeft + "px";
				}
			}
			// remove the fade class if we are reusing the scrollbar
			put(this.parentNode, '!dgrid-touch-scrollbar-fade');
		}
		t = evt.touches[0];
		current = {
			widget: evt.widget,
			node: this,
			startX: (this.instantScrollLeft || this.scrollLeft) + t.pageX,
			startY: (this.instantScrollTop || this.scrollTop) + t.pageY
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
		x = Math.min(Math.max(0.01, x), node.scrollWidth - node.offsetWidth);
		y = Math.min(Math.max(0.01, y), node.scrollHeight - node.offsetHeight);
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
				on.emit(node, "scroll", {
					pseudoTouch: true
				});
			}	
		}
		if(!hasTouchScrolling){
			// move the scrollbar
			var scrollbarXNode = node.scrollbarXNode;
			var scrollbarYNode = node.scrollbarYNode;
			scrollbarXNode && (scrollbarXNode.style.WebkitTransform = "translate3d(" + (x * node.offsetWidth / node.scrollWidth) + "px,0,0)");
			scrollbarYNode && (scrollbarYNode.style.WebkitTransform = "translate3d(0," + (y * node.offsetHeight / node.scrollHeight) + "px,0)");
		}
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
	var lastGlideTime;
	function startGlide(info){
		// starts glide operation when drag ends
		var id = info.widget.id, g;
		if(!info.velX && !info.velY){ 
			fadeScrollBars(info.node);
			return; 
		} // no glide to perform
		
		g = glide[id] = info; // reuse object for widget/node/vel properties
		g.calcFunc = function(){ calcGlide(id); }
		lastGlideTime = new Date().getTime();
		g.timer = setTimeout(g.calcFunc, timerRes);
	}
	function calcGlide(id){
		// performs glide and decelerates according to widget's glideDecel method
		var g = glide[id], x, y, node, widget,
			vx, vy, nvx, nvy, // old and new velocities
			now = new Date().getTime(),
			sinceLastGlide = now - lastGlideTime;
		if(!g){ return; }
		node = g.node;
		widget = g.widget;
		// we use instantScroll... so that OnDemandList has something to pull from to get the current value (needed for ios5 with touch scrolling) 
		x = node.instantScrollLeft || node.scrollLeft;
		y = node.instantScrollTop || node.scrollTop;
		// note that velocity is measured in pixels per millisecond
		vx = g.velX;
		vy = g.velY;
		nvx = widget.glideDecel(vx, sinceLastGlide);
		nvy = widget.glideDecel(vy, sinceLastGlide);
		
		var continueGlide;
		if(Math.abs(nvx) >= glideThreshold || Math.abs(nvy) >= glideThreshold){
			// still above stop threshold; update scroll positions
			scroll(node, x + nvx * sinceLastGlide, y + nvy * sinceLastGlide); // for each dimension multiply the velocity (px/ms) by the ms elapsed
			if((node.instantScrollLeft || node.scrollLeft) != x || (node.instantScrollTop || node.scrollTop) != y){
				// still scrollable; update velocities and schedule next tick
				continueGlide = true;
				g.velX = nvx;
				g.velY = nvy;
				g.timer = setTimeout(g.calcFunc, timerRes);
			}
		}
		if(!continueGlide){
			fadeScrollBars(node);
			
		}
		lastGlideTime = now;
	}
	function fadeScrollBars(node){
		// add the fade class so that scrollbar fades to transparent
		put(node.parentNode, '.dgrid-touch-scrollbar-fade');
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
		// friction: Float
		// 		This is the friction deceleration measured in pixels/milliseconds^2
		friction: 0.0006,
		glideDecel: function(n, sinceLastGlide){
			// summary:
			//		Deceleration algorithm. Given a number representing velocity,
			//		returns a new velocity to impose for the next "tick".
			//		(Don't forget that velocity can be positive or negative!)
			return n + (n > 0 ? -sinceLastGlide : sinceLastGlide) * this.friction; // Number
		}
	});
});