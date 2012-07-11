// FIXME:
// * use transitions in glide routines

define(["dojo/_base/declare", "dojo/on", "./util/has-css3", "put-selector/put", "xstyle/css!./css/TouchScroll.css"],
function(declare, on, has, put){
	var
		calcTimerRes = 100, // ms between drag velocity measurements
		glideTimerRes = 30, // ms between glide animation ticks
		transitionDuration = 250, // duration (ms) for each CSS transition step
		touches = {}, // records number of touches on components
		current = {}, // records info for widget(s) currently being scrolled
		glideThreshold = 1, // speed (in px) below which to stop glide - TODO: remove
		scrollbarAdjustment = 8, // number of px to adjust scrollbar dimension calculations
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
		return function(){};
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
	
	function showScrollbars(widget){
		// Handles displaying of X/Y scrollbars as appropriate when a touchstart
		// occurs.
		
		var node = widget.touchNode,
			parentNode = node.parentNode,
			parentWidth = parentNode.offsetWidth - scrollbarAdjustment,
			parentHeight = parentNode.offsetHeight - scrollbarAdjustment,
			scrollbarNode;
		
		if(node.scrollWidth > parentNode.offsetWidth){
			if(!widget._scrollbarXNode){
				scrollbarNode = put(parentNode, "div.touchscroll-x");
			}
			scrollbarNode = widget._scrollbarXNode =
				widget._scrollbarXNode || put(scrollbarNode, "div.touchscroll-bar");
			scrollbarNode.style.width =
				parentWidth * parentWidth / node.scrollWidth + "px";
			scrollbarNode.style.left = node.offsetLeft + "px";
			put(parentNode, ".touchscroll-scrollable-x");
		}else{
			put(parentNode, "!touchscroll-scrollable-x");
		}
		if(node.scrollHeight > parentNode.offsetHeight){
			if(!widget._scrollbarYNode){
				scrollbarNode = put(parentNode, "div.touchscroll-y");
			}
			scrollbarNode = widget._scrollbarYNode =
				widget._scrollbarYNode || put(scrollbarNode, "div.touchscroll-bar");
			scrollbarNode.style.height =
				parentHeight * parentHeight / node.scrollHeight + "px";
			scrollbarNode.style.top = node.offsetTop + "px";
			put(parentNode, ".touchscroll-scrollable-y");
		}else{
			put(parentNode, "!touchscroll-scrollable-y");
		}
		put(parentNode, "!touchscroll-fadeout");
	}
	
	function scroll(widget, x, y){
		// Handles updating of scroll position (from touchmove or glide).
		
		var node = widget.touchNode,
			parentNode = node.parentNode;
		
		// Update transform on touchNode
		node.style[transformProp] =
			translatePrefix + -x + "px," + -y + "px" + translateSuffix;
		
		// Update scrollbar positions
		if(widget._scrollbarXNode){
			widget._scrollbarXNode.style[transformProp] = translatePrefix +
				(x * parentNode.offsetWidth / node.scrollWidth) + "px,0" + translateSuffix;
		}
		if(widget._scrollbarYNode){
			widget._scrollbarYNode.style[transformProp] = translatePrefix + "0," +
				(y * parentNode.offsetHeight / node.scrollHeight) + "px" + translateSuffix;
		}
		
		// Emit a scroll event that can be captured by handlers, passing along
		// scroll information in the event itself (since we already have the info,
		// and it'd be difficult to get from the node).
		on.emit(widget.touchNode.parentNode, "scroll", {
			scrollLeft: x,
			scrollTop: y
		});
	}
	
	// functions for handling touch events on node to be scrolled
	
	function ontouchstart(evt){
		var widget = evt.widget,
			id = widget.id,
			posX = 0,
			posY = 0,
			touch, match, curr;
		
		// Check touches count (which hasn't counted this touch yet);
		// ignore touch events on inappropriate number of contact points.
		if(touches[id] !== widget.touchesToScroll - 1){ return; }
		
		if((curr = current[id])){
			// determine current translate X/Y from final used values
			match = matrixRx.exec(window.getComputedStyle(this)[transformProp]);
		}else{
			// determine current translate X/Y from applied style
			match = translateRx.exec(this.style[transformProp]);
		}
		if(match){
			posX = +match[1];
			posY = +match[2];
		}
		if(curr){
			// stop any active glide on this widget, since it's been re-touched
			clearTimeout(curr.timer);
			this.style[transitionPrefix + "Duration"] = "0";
			this.style[transformProp] =
				translatePrefix + posX + "px," + posY + "px" + translateSuffix;
		}
		
		touch = evt.targetTouches[0];
		curr = current[id] = {
			widget: widget,
			node: this,
			// subtract touch coords now, then add back later, so that translation
			// goes further negative when moving upwards
			startX: posX - touch.pageX,
			startY: posY - touch.pageY,
			lastX: posX,
			lastY: posY,
			tickFunc: function(){ calcTick(id); }
		};
		curr.timer = setTimeout(curr.tickFunc, calcTimerRes);
	}
	function ontouchmove(evt){
		var widget = evt.widget,
			id = widget.id,
			curr = current[id],
			parentNode = this.parentNode,
			touch, nx, ny;
		
		// Ignore touchmove events with inappropriate number of contact points.
		if(touches[id] !== widget.touchesToScroll || !curr){
			return;
		}
		
		touch = evt.targetTouches[0];
		nx = Math.max(Math.min(0, curr.startX + touch.pageX),
			-(this.scrollWidth - parentNode.offsetWidth));
		ny = Math.max(Math.min(0, curr.startY + touch.pageY),
			-(this.scrollHeight - parentNode.offsetHeight));
		
		// Show touch scrollbars on first sign of drag.
		if(!curr.scrollbarsShown){
			showScrollbars(widget, this);
			curr.scrollbarsShown = true;
		}
		
		// squelch the event and scroll the area
		evt.preventDefault();
		evt.stopPropagation();
		scroll(widget, -nx, -ny); // call scroll with positive coordinates
	}
	function ontouchend(evt){
		var widget = evt.widget,
			id = widget.id,
			curr = current[id];
		
		if(touches[id] != widget.touchesToScroll || !curr){ return; }
		if(curr.timer){ clearTimeout(curr.timer); }
		startGlide(curr);
	}
	
	// glide-related functions
	
	function calcTick(id){
		// Calculates current speed of touch drag
		var curr = current[id],
			node, match, x, y;
		
		if(!curr){ return; } // no currently-scrolling widget; abort
		
		node = curr.node;
		match = translateRx.exec(node.style[transformProp]);
		
		if(match){
			x = +match[1];
			y = +match[2];
			
			// If previous reference point already exists, calculate velocity
			curr.velX = x - curr.lastX;
			curr.velY = y - curr.lastY;
			
			// set previous reference point for future iteration or calculation
			curr.lastX = x;
			curr.lastY = y;
		} else {
			curr.lastX = curr.lastY = 0;
		}
		curr.timer = setTimeout(curr.tickFunc, calcTimerRes);
	}
	
	function startGlide(curr){
		// starts glide operation when drag ends
		var id = curr.widget.id,
			match, posX, posY;
		
		// calculate velocity based on time and displacement since last tick
		curr.timer && clearTimeout(curr.timer);
		match = translateRx.exec(curr.node.style[transformProp]);
		if(match){
			posX = +match[1];
			posY = +match[2];
		} else {
			posX = posY = 0;
		}
		
		if(!curr.velX && !curr.velY){ // no glide to perform
			put(curr.node.parentNode, ".touchscroll-fadeout");
			delete current[id];
			return;
		}
		
		// update lastX/Y with current position, for glide calculations
		curr.lastX = posX;
		curr.lastY = posY;
		curr.calcFunc = function(){ calcGlide(id); };
		curr.timer = setTimeout(curr.calcFunc, glideTimerRes);
	}
	function calcGlide(id){
		// performs glide and decelerates according to widget's glideDecel method
		var curr = current[id],
			node, parentNode, widget,
			x, y, nx, ny, nvx, nvy; // old/new coords and new velocities
		
		if(!curr){ return; }
		
		node = curr.node;
		parentNode = node.parentNode,
		widget = curr.widget;
		x = curr.lastX;
		y = curr.lastY;
		nvx = widget.glideDecel(curr.velX);
		nvy = widget.glideDecel(curr.velY);
		
		if(Math.abs(nvx) >= glideThreshold || Math.abs(nvy) >= glideThreshold){
			// still above stop threshold; update transformation
			nx = Math.max(Math.min(0, x + nvx), -(node.scrollWidth - parentNode.offsetWidth));
			ny = Math.max(Math.min(0, y + nvy), -(node.scrollHeight - parentNode.offsetHeight));
			if(nx != x || ny != y){
				// still scrollable; update offsets/velocities and schedule next tick
				scroll(widget, -nx, -ny); // call scroll with positive coordinates
				// update information
				curr.lastX = nx;
				curr.lastY = ny;
				curr.velX = nvx;
				curr.velY = nvy;
				curr.timer = setTimeout(curr.calcFunc, glideTimerRes);
			}else{
				put(curr.node.parentNode, ".touchscroll-fadeout");
				delete current[id];
			}
		}else{
			put(curr.node.parentNode, ".touchscroll-fadeout");
			delete current[id];
		}
	}
	
	function incrementTouchCount(evt){
		touches[evt.widget.id] += evt.changedTouches.length;
	}
	function decrementTouchCount(evt){
		touches[evt.widget.id] -= evt.changedTouches.length;
	}
	
	return declare([], {
		// touchesToScroll: Number
		//		Number of touches to require on the component's touch target node
		//		in order to trigger scrolling behavior.
		touchesToScroll: 1,
		
		// touchNode: DOMNode?
		//		Node upon which event listeners should be hooked and scroll behavior
		//		should be based.  If not specified, defaults to containerNode.
		touchNode: null,
		
		startup: function(){
			if(!this._started){
				this._initTouch();
				this.inherited(arguments);
			}
		},
		
		_initTouch: function(){
			var node = this.touchNode = this.touchNode || this.containerNode,
				widget = this;
			
			if(!node || !node.parentNode){
				// Bail out if we have no touchNode or containerNode, or if we don't
				// seem to have a parent node to work with.
				console.warn("TouchScroll requires a nested node upon which to operate.");
				return;
			}
			
			// Set overflow to hidden in order to prevent any native scroll logic.
			node.parentNode.style.overflow = "hidden";
			
			node.style[transitionPrefix + "Property"] = cssPrefix + "transform";
			
			function wrapHandler(func){
				return function(evt){
					evt.widget = widget;
					func.call(this, evt);
				};
			}
			
			touches[this.id] = 0;
			
			this._touchScrollListeners = [
				on(node, "touchstart", wrapHandler(ontouchstart)),
				on(node, "touchmove", wrapHandler(ontouchmove)),
				on(node, "touchend,touchcancel", wrapHandler(ontouchend)),
				// Don't need to wrap the following, since the touchstart handler
				// above already decorates the event
				on(node, "touchstart", incrementTouchCount),
				on(node, "touchend,touchcancel", decrementTouchCount)
			];
		},
		
		destroy: function(){
			var i = this._touchScrollListeners.length;
			while(i--){
				this._touchScrollListeners[i].remove();
			}
			delete touches[this.id];
			delete current[this.id];
			
			this.inherited(arguments);
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
