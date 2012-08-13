// FIXME:
// * fully make use of transitions in glide routines

define(["dojo/_base/declare", "dojo/on", "./util/has-css3", "put-selector/put", "xstyle/css!./css/TouchScroll.css"],
function(declare, on, has, put){
	var
		calcTimerRes = 50, // ms between drag velocity measurements
		glideTimerRes = 30, // ms between glide animation ticks
		touches = {}, // records number of touches on components
		current = {}, // records info for widget(s) currently being scrolled
		glideThreshold = 1, // speed (in px) below which to stop glide - TODO: remove
		scrollbarAdjustment = 8, // number of px to adjust scrollbar dimension calculations
		// RegExps for parsing relevant x/y from translate and matrix values:
		translateRx = /^translate(?:3d)?\((-?\d+)(?:\.\d*)?(?:px)?, (-?\d+)/,
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
	transitionPrefix = hasTransitions === true ? "transition" :
		hasTransitions + "Transition";
	cssPrefix = hasTransforms === true ? "" :
		"-" + hasTransforms.toLowerCase() + "-";
	
	function showScrollbars(widget, curr){
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
			curr.scrollableX = true;
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
			curr.scrollableY = true;
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
	
	function getScrollStyle(widget){
		// Returns match object for current scroll position based on transform.
		if(current[widget.id]){
			// Mid-transition: determine current X/Y from computed values.
			return matrixRx.exec(window.getComputedStyle(widget.touchNode)[transformProp]);
		}
		// Otherwise, determine current X/Y from applied style.
		return translateRx.exec(widget.touchNode.style[transformProp]);
	}
	
	function resetEffects(){
		// Function to cut glide/bounce short, called in context of an object
		// from the current hash; attached only when a glide or bounce occurs.
		// Used by ontouchstart handler, and by scrollTo on instances
		// (in case it's called directly during a glide/bounce).
		
		// Clear glide timer.
		if(this.timer){
			clearTimeout(this.timer);
			this.timer = null;
		}
		
		// Clear transition handlers, as we're about to cut it short.
		if(this.transitionHandlers){
			// Unhook any existing transitionend handlers, since we'll be
			// canceling the transition and handling things in touch events.
			for(var i = this.transitionHandlers.length; i--;){
				this.transitionHandlers[i].remove();
			}
			delete this.transitionHandlers;
		}
		
		// Clear transition duration.
		this.node.style[transitionPrefix + "Duration"] = "0";
		
		// Remove this method so it can't be called again.
		delete this.resetEffects;
	}
	
	// functions for handling touch events on node to be scrolled
	
	function ontouchstart(evt){
		var widget = evt.widget,
			node = widget.touchNode,
			id = widget.id,
			posX = 0,
			posY = 0,
			touch, match, curr, i;
		
		// Check touches count (which hasn't counted this touch yet);
		// ignore touch events on inappropriate number of contact points.
		if(touches[id] !== widget.touchesToScroll - 1){ return; }
		
		match = getScrollStyle(widget);
		if(match){
			posX = +match[1];
			posY = +match[2];
		}
		if((curr = current[id])){
			// stop any active glide or bounce, since it's been re-touched
			if(curr.resetEffects){ curr.resetEffects(); }
			
			node.style[transformProp] =
				translatePrefix + posX + "px," + posY + "px" + translateSuffix;
		}
		
		touch = evt.targetTouches[0];
		curr = current[id] = {
			widget: widget,
			node: node,
			// Subtract touch coords now, then add back later, so that translation
			// goes further negative when moving upwards.
			startX: posX - touch.pageX,
			startY: posY - touch.pageY,
			// Initialize lastX/Y, in case of a fast flick (< 1 full calc cycle).
			lastX: posX,
			lastY: posY,
			// Also store original pageX/Y for threshold check.
			pageX: touch.pageX,
			pageY: touch.pageY,
			tickFunc: function(){ calcTick(id); }
		};
		curr.timer = setTimeout(curr.tickFunc, calcTimerRes);
	}
	function ontouchmove(evt){
		var widget = evt.widget,
			id = widget.id,
			curr = current[id],
			node = curr && curr.node,
			parentNode = this,
			targetTouches, touch, nx, ny, minX, minY, i;
		
		// Ignore touchmove events with inappropriate number of contact points.
		if(touches[id] !== widget.touchesToScroll || !curr){
			return;
		}
		
		targetTouches = evt.targetTouches;
		touch = targetTouches[0];
		
		// Show touch scrollbars on first sign of drag.
		if(!curr.scrollbarsShown){
			if(Math.abs(touch.pageX - curr.pageX) > widget.scrollThreshold ||
					Math.abs(touch.pageY - curr.pageY) > widget.scrollThreshold){
				showScrollbars(widget, curr);
				curr.scrollbarsShown = true;
				
				// Add flag to involved touches to provide indication to other handlers.
				for(i = targetTouches.length; i--;){
					targetTouches[i].touchScrolled = true;
				}
			}
		}
		
		// Squelch the event, and scroll the area if beyond the threshold.
		evt.preventDefault();
		evt.stopPropagation();
		
		if(curr.scrollbarsShown && (curr.scrollableX || curr.scrollableY)){
			nx = curr.scrollableX ? curr.startX + touch.pageX : 0;
			ny = curr.scrollableY ? curr.startY + touch.pageY : 0;
			
			minX = curr.scrollableX ? -(node.scrollWidth - parentNode.offsetWidth) : 0;
			minY = curr.scrollableY ? -(node.scrollHeight - parentNode.offsetHeight) : 0;
			
			// If dragged beyond edge, halve the distance between.
			if(nx > 0){
				nx = nx / 2;
			}else if(nx < minX){
				nx = minX - (minX - nx) / 2;
			}
			if(ny > 0){
				ny = ny / 2;
			}else if(ny < minY){
				ny = minY - (minY - ny) / 2;
			}
			
			scroll(widget, -nx, -ny); // call scroll with positive coordinates
		}
	}
	function ontouchend(evt){
		var widget = evt.widget,
			id = widget.id,
			curr = current[id];
		
		if(touches[id] != widget.touchesToScroll || !curr){ return; }
		startGlide(id);
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
	
	function bounce(id, lastX, lastY){
		// Function called when a scroll ends, to handle rubber-banding beyond edges.
		var curr = current[id],
			widget = curr.widget,
			node = curr.node,
			parentNode = node.parentNode,
			scrollbarNode,
			x = curr.scrollableX ?
				Math.max(Math.min(0, lastX), -(node.scrollWidth - parentNode.offsetWidth)) :
				lastX,
			y = curr.scrollableY ?
				Math.max(Math.min(0, lastY), -(node.scrollHeight - parentNode.offsetHeight)) :
				lastY;
		
		function end(){
			// Performs reset operations upon end of scroll process.
			
			// Reset duration, in case anything else externally tweaks the transform.
			node.style[transitionPrefix + "Duration"] = "0";
			
			put(parentNode, ".touchscroll-fadeout");
			delete curr.resetEffects;
			delete current[id];
		}
		
		function scrollbarEnd(evt){
			this.style[transitionPrefix + "Duration"] = "0";
		}
		
		// Timeout will have been cleared before bounce call, so remove timer.
		delete curr.timer;
		
		if (x != lastX || y != lastY){
			curr.resetEffects = resetEffects;
			curr.transitionHandlers = [on.once(node, hasTransitionEnd, end)];
			node.style[transitionPrefix + "Duration"] = widget.bounceDuration + "ms";
			node.style[transformProp] =
				translatePrefix + x + "px," + y + "px" + translateSuffix;
			
			// Also handle transitions for scrollbars.
			if(x != lastX && curr.scrollableX){
				scrollbarNode = curr.widget._scrollbarXNode;
				curr.transitionHandlers.push(
					on.once(scrollbarNode, hasTransitionEnd, scrollbarEnd));
				scrollbarNode.style[transitionPrefix + "Duration"] =
					widget.bounceDuration + "ms";
				if(lastX > x){
					// Further left; bounce back right
					scrollbarNode.style[transformProp] =
						translatePrefix + "0,0" + translateSuffix;
				}else{
					// Further right; bounce back left
					scrollbarNode.style[transformProp] =
						translatePrefix +
						(scrollbarNode.parentNode.offsetWidth - scrollbarNode.offsetWidth) +
						"px,0" + translateSuffix;
				}
			}
			if(y != lastY && curr.scrollableY){
				scrollbarNode = curr.widget._scrollbarYNode;
				curr.transitionHandlers.push(
					on.once(scrollbarNode, hasTransitionEnd, scrollbarEnd));
				scrollbarNode.style[transitionPrefix + "Duration"] =
					widget.bounceDuration + "ms";
				if(lastY > y){
					// Above top; bounce back down
					scrollbarNode.style[transformProp] =
						translatePrefix + "0,0" + translateSuffix;
				}else{
					// Below bottom; bounce back up
					scrollbarNode.style[transformProp] =
						translatePrefix + "0," +
						(scrollbarNode.parentNode.offsetHeight - scrollbarNode.offsetHeight) +
						"px" + translateSuffix;
				}
			}
		}else{
			end(); // no rubber-banding necessary; just reset
		}
	}
	
	function startGlide(id){
		// starts glide operation when drag ends
		var curr = current[id],
			node = curr.node,
			parentNode = node.parentNode,
			match, posX, posY;
		
		if(curr.timer){ clearTimeout(curr.timer); }
		
		// calculate velocity based on time and displacement since last tick
		match = translateRx.exec(curr.node.style[transformProp]);
		if(match){
			posX = +match[1];
			posY = +match[2];
		} else {
			posX = posY = 0;
		}
		
		// If there is no glide to perform (no exit velocity), or if we are
		// beyond boundaries on all applicable edges, immediately bounce back.
		if((!curr.velX && !curr.velY) ||
				((posX >= 0 || posX <= -(node.scrollWidth - parentNode.offsetWidth)) &&
				(posY >= 0 || posY <= -(node.scrollHeight - parentNode.offsetHeight)))){
			bounce(id, posX, posY);
			return;
		}
		
		// update lastX/Y with current position, for glide calculations
		curr.lastX = posX;
		curr.lastY = posY;
		curr.calcFunc = function(){ calcGlide(id); };
		curr.resetEffects = resetEffects;
		curr.timer = setTimeout(curr.calcFunc, glideTimerRes);
	}
	function calcGlide(id){
		// performs glide and decelerates according to widget's glideDecel method
		var curr = current[id],
			node, parentNode, widget, i,
			nx, ny, nvx, nvy, // old/new coords and new velocities
			BOUNCE_DECELERATION_AMOUNT = 6;
		
		if(!curr){ return; }
		
		node = curr.node;
		parentNode = node.parentNode;
		widget = curr.widget;
		nvx = widget.glideDecel(curr.velX);
		nvy = widget.glideDecel(curr.velY);
		
		if(Math.abs(nvx) >= glideThreshold || Math.abs(nvy) >= glideThreshold){
			// still above stop threshold; update transformation
			nx = curr.lastX + nvx;
			ny = curr.lastY + nvy;
			
			// If glide has traveled beyond any edges, institute rubber-band effect
			// by further decelerating.
			if(nx > 0 || nx < -(node.scrollWidth - parentNode.offsetWidth)){
				for(i = BOUNCE_DECELERATION_AMOUNT; i--;){
					nvx = widget.glideDecel(nvx);
				}
			}
			if(ny > 0 || ny < -(node.scrollHeight - parentNode.offsetHeight)){
				for(i = BOUNCE_DECELERATION_AMOUNT; i--;){
					nvy = widget.glideDecel(nvy);
				}
			}
			
			// still scrollable; update offsets/velocities and schedule next tick
			scroll(widget, -nx, -ny); // call scroll with positive coordinates
			// update information
			curr.lastX = nx;
			curr.lastY = ny;
			curr.velX = nvx;
			curr.velY = nvy;
			curr.timer = setTimeout(curr.calcFunc, glideTimerRes);
		}else{
			bounce(id, curr.lastX, curr.lastY);
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
		//		Node upon which scroll behavior will be based; transformations will be
		//		applied to this node, and events and some DOM/styles will be applied
		//		to its *parent*.  If not specified, defaults to containerNode.
		touchNode: null,
		
		// scrollThreshold: Number
		//		Minimum number of pixels to wait for user to scroll (in any direction)
		//		before initiating scroll.
		scrollThreshold: 10,
		
		// bounceDuration: Number
		//		Number of milliseconds which "rubber-banding" transitions
		//		(i.e. bouncing back from beyond edges) should take.
		bounceDuration: 300,
		
		startup: function(){
			if(!this._started){
				this._initTouch();
				this.inherited(arguments);
			}
		},
		
		_initTouch: function(){
			var node = this.touchNode = this.touchNode || this.containerNode,
				widget = this,
				parentNode;
			
			if(!node || !node.parentNode){
				// Bail out if we have no touchNode or containerNode, or if we don't
				// seem to have a parent node to work with.
				console.warn("TouchScroll requires a nested node upon which to operate.");
				return;
			}
			
			parentNode = node.parentNode;
			
			// Set overflow to hidden in order to prevent any native scroll logic.
			parentNode.style.overflow = "hidden";
			
			node.style[transitionPrefix + "Property"] = cssPrefix + "transform";
			node.style[transitionPrefix + "TimingFunction"] =
				"cubic-bezier(0.33, 0.66, 0.66, 1)";
			
			function wrapHandler(func){
				return function(evt){
					evt.widget = widget;
					func.call(this, evt);
				};
			}
			
			touches[this.id] = 0;
			
			this._touchScrollListeners = [
				on(parentNode, "touchstart", wrapHandler(ontouchstart)),
				on(parentNode, "touchmove", wrapHandler(ontouchmove)),
				on(parentNode, "touchend,touchcancel", wrapHandler(ontouchend)),
				// Don't need to wrap the following, since the touchstart handler
				// above already decorates the event
				on(parentNode, "touchstart", incrementTouchCount),
				on(parentNode, "touchend,touchcancel", decrementTouchCount)
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
		
		scrollTo: function(x, y){
			// summary:
			//      Scrolls the widget to a specific position.
			
			var curr = current[this.id];
			if(curr && curr.resetEffects){
				// Stop any glide or bounce occurring before scrolling.
				curr.resetEffects();
				// Ensure that any touch-scrollbars fade out.
				put(curr.node.parentNode, ".touchscroll-fadeout");
			}
			scroll(this, x, y);
		},
		
		getScrollPosition: function(){
			// summary:
			//      Determines current translation from computed style
			//      (if mid-transition), or applied style.
			var match = getScrollStyle(this);
			return match ? { x: -match[1], y: -match[2] } : { x: 0, y: 0 };
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
