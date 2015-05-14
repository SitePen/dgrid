define([ 'require' ], function (require) {
	// Add dgrid.css to the page
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = require.toUrl('../../css/dgrid.css');
	document.getElementsByTagName('head')[0].appendChild(link);
});
