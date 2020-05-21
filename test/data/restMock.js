/*
Client-side request mock for testing grids with dstore/Rest
Sort: not supported
Paging: supports both "limit(count,start)" in the querystring and Range/X-Range header: items=start-end
Hierarchical data: supports the "parent" parameter in the querystring
See: https://github.com/SitePen/dstore/blob/master/docs/Stores.md#request
*/
define([
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/io-query',
	'dojo/json',
	'./restHelpers'
], function (lang, Deferred, ioQuery, JSON, restHelpers) {
	var RESPONSE_DELAY_MIN = 20;
	var RESPONSE_DELAY_MAX = 100;
	var TOTAL_ITEM_COUNT = 500;

	return function restMock (url, options) {
		var responseHeaders = {
			'content-type': 'application/json'
		};
		var searchParams = ioQuery.queryToObject(url.match(/[^?]*(?:\?([^#]*))?/)[1] || '');
		var range = restHelpers.getRangeFromSearchParams(searchParams);
		var idPrefix = 'parent' in searchParams ?
			searchParams.parent === 'undefined' ? '' : (searchParams.parent + '-') : '';
		var data = [];
		var responseDelay = RESPONSE_DELAY_MAX ?
			Math.floor(Math.random() * ((RESPONSE_DELAY_MAX - RESPONSE_DELAY_MIN) + 1)) + 50 :
			0;
		var i;

		if (!range) {
			range = lang.mixin({
				start: 0,
				end: 40
			}, restHelpers.getRangeFromHeaders(options.headers));
		}

		range.end = Math.min(range.end, TOTAL_ITEM_COUNT);

		responseHeaders['content-range'] = 'items ' + range.start + '-' + range.end + '/' + TOTAL_ITEM_COUNT;

		for (i = range.start; i < range.end; i++) {
			data.push({
				id: idPrefix + i,
				name: (idPrefix ? ('Child ' + idPrefix) : 'Item ') + i,
				comment: 'hello'
			});
		}

		var responseText = JSON.stringify(data);
		var dfd = new Deferred();
		var responseDfd = new Deferred();
		responseDfd.resolve({
			getHeader: function (name) {
				return responseHeaders[name.toLowerCase()];
			},
			data: responseText
		});

		if (responseDelay) {
			setTimeout(function () {
				dfd.resolve(responseText);
			}, responseDelay);
		}
		else {
			dfd.resolve(responseText);
		}

		return lang.delegate(dfd.promise, {
			response: responseDfd
		});
	};
});
