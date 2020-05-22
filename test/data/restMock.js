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

	return function restMock (url, options) {
		var searchParams = ioQuery.queryToObject(url.match(/[^?]*(?:\?([^#]*))?/)[1] || '');
		var responseData = restHelpers.getResponseData(searchParams, options.headers);
		var responseHeaders = {
			'content-type': 'application/json',
			'content-range': responseData.contentRange
		};
		var responseDelay = restHelpers.getDelay(RESPONSE_DELAY_MIN, RESPONSE_DELAY_MAX);
		var responseText = JSON.stringify(responseData.items);
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
