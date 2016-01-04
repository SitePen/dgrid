define([
	'dojo/_base/array',
	'dojo/io-query'
], function (arrayUtil, ioQuery) {
	var q = location.search;
	var params = q ? ioQuery.queryToObject(q.substr(1)) : {};
	// Honor skin and RTL specification from query param
	var skin = params.skin || 'claro';
	var rtl = params.dir === 'rtl';

	// Add skin class to body
	document.body.className = skin;
	// Add dir=rtl to body if specified in query
	rtl && (document.body.dir = 'rtl');

	return {
		renderLinks: function (skins) {
			var documentFragment = document.createDocumentFragment();
			arrayUtil.forEach(skins, function (s) {
					var button = document.createElement('button');
					button.textContent = s;
					button.onclick = function() {
						document.body.className = button.textContent;
						grid.resize();
					};
					documentFragment.appendChild(button);
			});
			return documentFragment;
		},
		rtl: rtl,
		skin: skin
	};
});
