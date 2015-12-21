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
			return arrayUtil.map(skins, function (s) {
				return s === skin ? s :
					'<a href="skin.html?skin=' + s + (rtl ? '&dir=rtl' : '') + '">' + s + '</a>';
			}).join(' / ');
		},
		rtl: rtl,
		skin: skin
	};
});
