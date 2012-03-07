// FIXME:
// * always resets to 0 position on new drag
// * am I dragging the wrong node?
// * no glide (and doesn't yet use transitions)

define(["dojo/_base/declare", "dojo/on", "dojo/has", "./util/touch", "xstyle/css!./css/touchscroll.css"],
function(declare, on, has, touchUtil){
	var
		bodyTouchListener, // stores handle to body touch handler once connected
		timerRes = 15, // ms between drag velocity measurements
		transitionDuration = 250, // duration (ms) for each CSS transition step
		touches = 0, // records number of touches on document
		current = {}, // records info for widget currently being scrolled/glided
		glideThreshold = 1, // speed (in px) below which to stop glide - TODO: remove
		// RegExps for parsing relevant x/y from translate and matrix values:
		translateRx = /^translate(?:3d)?\((-?\d+)(?:px)?, (-?\d+)/,
		matrixRx = /^matrix\(1, 0, 0, 1, (-?\d+)(?:\.\d*)?(?:px)?, (-?\d+)/,
		// store has-features we need, for computing property/function names:
		hasTransitions = has("css-transitions"),
		hasTransitionEnd = has("transitionend"),
		hasTransforms = has("css-transforms"),
		hasTransforms3d = has("css-transforms3d"),
		// and declare vars to store info on the properties/functions we'll need
		cssPrefix, transitionPrefix, transformProp, translatePrefix, translateSuffix, transitionend;
	
	if(hasTransforms3d){
		translatePrefix = "translate3d(";
		translateSuffix = ",0)";
	}else if(hasTransforms){
		translatePrefix = "translate(";
		translateSuffix = ")";
	}
	
	if(!hasTransitions || !translatePrefix){
		console.warn("CSS3 features unavailable for touch scroll effects.");
		return;
	}
	
	// figure out strings for use later in events
	transformProp = hasTransforms3d || hasTransforms;
	transformProp = transformProp === true ? "transform" : transformProp + "Transform";
	transitionend = hasTransitionEnd === true ? "transitionend" :
		hasTransitionEnd + "TransitionEnd";
	transitionPrefix = hasTransitions === true ? "transition" :
		hasTransitions + "Transition";
	cssPrefix = hasTransforms === true ? "" :
		"-" + hasTransforms.toLowerCase() + "-";
	
	function updatetouchcount(evt){
		touches = evt.touches.length;
	}
	
	// functions for handling touch events on node to be scrolled
	
	function ontouchstart(evt){
		var id = evt.widget.id,
			touch, match, pos;
		
		// stop any active glide on this widget, since it's been re-touched
		if(current){
			clearTimeout(current.timer);
			
			// determine current translate X/Y from final used values
			match = matrixRx.exec(window.getComputedStyle(this, transformProp));
			pos = match && match.length == 3 ? match.slice(1) : [0, 0];
			
			// stop current transition in its tracks
			this.style[transitionPrefix + "Duration"] = "0";
			this.style[transformProp] =
				translatePrefix + pos[0] + "px," + pos[1] + "px" + translateSuffix;
		}else{
			// determine current translate X/Y from applied style
			match = translateRx.exec(this.style[transformProp]);
			pos = match && match.length == 3 ? match.slice(1) : [0, 0];
		}
		
		// check module-level touches count (which hasn't counted this touch yet)
		if(touches > 0){ return; } // ignore multitouch gestures
		
		touch = evt.touches[0];
		current = {
			widget: evt.widget,
			node: this,
			// subtract touch coords now, then add back later, so that translation
			// goes further negative when moving upwards
			start: [pos[0] - touch.pageX, pos[1] - touch.pageY],
			timer: setTimeout(calcTick, timerRes)
		};
	}
	function ontouchmove(evt){
		var touch, nx, ny;
		if(touches > 1 || !current){ return; } // ignore multitouch/invalid events
		
		touch = evt.touches[0];
		nx = Math.max(Math.min(0, current.start[0] + touch.pageX),
			-(this.scrollWidth - this.offsetWidth));
		ny = Math.max(Math.min(0, current.start[1] + touch.pageY),
			-(this.scrollHeight - this.offsetHeight));
		
		// snub event and "scroll" the area
		evt.preventDefault();
		evt.stopPropagation();
		this.style[transformProp] =
			translatePrefix + nx + "px," + ny + "px" + translateSuffix;
		
		on.emit(current.widget.domNode, "scroll", {});
	}
	function ontouchend(evt){
		if(touches != 1 || !current){ return; } // ignore multitouch/invalid events
		current.timer && clearTimeout(current.timer);
		startGlide();
	}
	
	// glide-related functions
	
	function calcTick(){
		// Calculates current speed of touch drag
		if(!current){ return; } // no currently-scrolling widget; abort
		
		var node = current.node,
			match = translateRx.exec(node.style[transformProp]),
			x = match[1] || 0,
			y = match[2] || 0;
		/*
		if("prevX" in current){
			// calculate velocity using previous reference point
			current.velX = x - current.prevX;
			current.velY = y - current.prevY;
		}
		*/
		// set previous reference point for future iteration or calculation
		current.lastPos = [x, y];
		current.lastTick = new Date();
		current.timer = setTimeout(calcTick, timerRes);
	}
	
	function startGlide(){
		// starts glide operation when drag ends
		var lastPos = current.lastPos,
			time, match, pos, vel;
		
		// calculate velocity based on time and displacement since last tick
		time = (new Date()) - current.lastTick;
		match = translateRx.exec(current.node.style[transformProp]);
		pos = match && match.length == 3 ? match.slice(1) : [0, 0];
		
		vel = [ // TODO: timerRes -> transitionDuration
			(pos[0] - lastPos[0]) / timerRes,
			(pos[1] - lastPos[1]) / timerRes
		];
		
		if(!vel[0] && !vel[1]){ return; } // no glide to perform
		
		// update lastPos with current position, for glide calculations
		current.lastPos = pos;
		current.calcFunc = function(){ calcGlide(); };
		current.timer = setTimeout(current.calcFunc, timerRes);
	}
	function calcGlide(){
		// performs glide and decelerates according to widget's glideDecel method
		var node, widget,
			x, y, nx, ny, nvx, nvy; // old/new coords and new velocities
		
		if(!current){ return; }
		
		node = current.node;
		widget = current.widget;
		x = current.lastPos[0];
		y = current.lastPos[1];
		nvx = widget.glideDecel(current.vel[0]);
		nvy = widget.glideDecel(current.vel[1]);
		
		if(Math.abs(nvx) >= glideThreshold || Math.abs(nvy) >= glideThreshold){
			// still above stop threshold; update transformation
			nx = Math.max(Math.min(0, x + nvx), -(node.scrollWidth - node.offsetWidth));
			ny = Math.max(Math.min(0, y + nvy), -(node.scrollHeight - node.offsetHeight));
			if(nx != x || ny != y){
				// still scrollable; update velocities and schedule next tick
				node.style[transformProp] =
					translatePrefix + nx + "px," + ny + "px" + translateSuffix;
				/* old
				node.scrollLeft += nvx;
				node.scrollTop += nvy;
				*/
				// update information
				current.lastPos = [nx, ny];
				current.vel = [nvx, nvy];
				current.timer = setTimeout(current.calcFunc, timerRes);
			}
		}
	}
	
	return declare([], {
		startup: function(){
			!this._started && this._initTouch();
		},
		_initTouch: function(){
			var node = this.touchNode = this.touchNode || this.containerNode || this.domNode,
				widget = this;
			
			node.style[transitionPrefix + "Property"] = cssPrefix + "transform";
			
			// add touch event handlers
			on(node, "touchstart", function(evt){
				evt.widget = widget;
				ontouchstart.call(this, evt);
			});
			on(node, "touchmove", ontouchmove);
			on(node, "touchend,touchcancel", ontouchend);
			
			if(!bodyTouchListener){
				// first call ever: hook up touch listeners to entire body,
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
