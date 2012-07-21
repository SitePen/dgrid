define([], function(){
	// This module defines miscellaneous utility methods.
	var util = {
		defaultDelay: 15,
		throttle: function(cb, context, delay){
			// summary:
			//		Returns a function which calls the given callback at most once per
			//		delay milliseconds.  (Inspired by plugd)
			var ran = false;
			delay = delay || util.defaultDelay;
			return function(){
				if(ran){ return; }
				ran = true;
				cb.apply(context, arguments);
				setTimeout(function(){ ran = false; }, delay);
			}
		},
		throttleDelayed: function(cb, context, delay, useLastArgs){
			// summary:
			//		Like throttle, except that the callback runs after the delay,
			//		rather than before it.
			//		useLastArgs: If true, the arguments from the last invocation will be used, matching debounce()
			var ran = false,
				a;
			delay = delay || util.defaultDelay;
			return function(){
				if(!ran || useLastArgs){
					a = arguments;
				}
				if(ran){ return; }
				ran = true;
				setTimeout(function(){
					cb.apply(context, a);
					ran = false;
				}, delay);
			}
		},
		throttleCombined: function(cb, context, delay, useLastArgs){
			// summary:
			//		A combination of throttle and throttleDelayed; The first call within delay passes through immediately
			//		so the action appears instantaneous to the user, but any further calls within delay are collapsed into 
			//		a single call. Note that this call will fire twice per delay if continuously invoked. 
			//		useLastArgs: If true, the arguments from the last invocation will be used, matching debounce() 
			var count = 0, 
				a;
			delay = delay || util.defaultDelay;
			return function(){
				if(!count++ || useLastArgs){
					a = arguments;
				}
				if(count == 1){
					cb.apply(context, a);
					setTimeout(function(){
						if(count > 1){
							cb.apply(context, a);
						}
						count = 0;
					}, delay);
				}
			}
		},
		debounce: function(cb, context, delay){
			// summary:
			//		Returns a function which calls the given callback only after a
			//		certain time has passed without successive calls.  (Inspired by plugd)
			var timer;
			delay = delay || util.defaultDelay;
			return function(){
				if(timer){
					clearTimeout(timer);
					timer = null;
				}
				var a = arguments;
				timer = setTimeout(function(){
					cb.apply(context, a);
				}, delay);
			}
		}
	};
	return util;
});