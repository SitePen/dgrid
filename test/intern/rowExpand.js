define([
	'dojo/Deferred',
	'dojo/on',
	'dgrid/util/has-css3'
], function (Deferred, on, has) {
	// Define a function returning a promise resolving once children are expanded.
	// On browsers which support CSS3 transitions, this occurs when transitionend fires;
	// otherwise it occurs immediately.
	var hasTransitionEnd = has('transitionend');
	return hasTransitionEnd ? function (grid, id) {
		var dfd = new Deferred();

		on.once(grid, hasTransitionEnd, function () {
			dfd.resolve();
		});

		grid.expand(id);
		return dfd.promise;
	} : function (grid, id) {
		var dfd = new Deferred();
		grid.expand(id);
		dfd.resolve();
		return dfd.promise;
	};
});
