define([], function(){
	// This module defines miscellaneous utility methods.
	
	return {
		throttle: function(cb, delay){
			// summary:
			//		Returns a function which calls the given callback at most every
			//		delay milliseconds.  (Inspired by plugd)
			var ran = false;
			return function(){
				if(ran){ return; }
				ran = true;
				cb.apply(null, arguments);
				setTimeout(function(){ ran = false; }, delay);
			}
		},
		debounce: function(cb, delay){
			// summary:
			//		Returns a function which calls the given callback only after a
			//		certain time has passed without successive calls.  (Inspired by plugd)
			var timer;
			return function(){
				if(timer){
					clearTimeout(timer);
					timer = null;
				}
				var a = arguments;
				timer = setTimeout(function(){
					cb.apply(null, a);
				}, delay);
			}
		}
	};
});