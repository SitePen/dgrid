define([ 'require' ], function (require) {
	return {
		// Expose this module as an AMD plugin which will wait until the
		// link element has loaded the stylesheet.
		// (This uses least-common-denominator logic from xstyle/core/load-css.)
		load: function (id, parentRequire, loaded) {
			var link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = require.toUrl('../../css/dgrid.css');
			document.getElementsByTagName('head')[0].appendChild(link);

			var interval = setInterval(function () {
				if (link.style) {
					clearInterval(interval);
					loaded();
				}
			}, 15);
		}
	};
});
