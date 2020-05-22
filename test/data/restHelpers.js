// partial UMD - only supports AMD and CommonJS, no global
// for use with both client-side mocking (restMock.js) and Node.js server (rest-node.js)
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	}
	else if (typeof exports === 'object') {
		module.exports = factory();
	}
}(function () {
	var TOTAL_ITEM_COUNT = 500;

	var limitRegex = /^limit\((\d+),*(\d+)*\)/;
	var rangeHeaderRegex = /(\d+)-(\d+)/;

	function getDelay (min, max) {
		return max ?
			Math.floor(Math.random() * ((max - min) + 1)) + min :
			0;
	}

	function getRangeFromHeaders (headers) {
		var rangeString = headers && (headers.Range || headers.range || headers['X-Range'] || headers['x-range']);
		var match;
		var range = {};

		if (rangeString) {
			match = rangeHeaderRegex.exec(rangeString);
			if (match && match[2]) {
				range.start = parseInt(match[1], 10);
				range.end = parseInt(match[2], 10) + 1;
			}
		}

		return range;
	}

	function getRangeFromSearchParams (searchParams) {
		var searchParam;
		var match;
		var range;

		for (searchParam in searchParams) {
			match = limitRegex.exec(searchParam);

			if (match) {
				range = { start: 0 };

				if (match[2]) {
					range.start = parseInt(match[2], 10);
				}
				range.end = range.start + parseInt(match[1], 10);
			}
		}

		return range;
	}

	function getResponseData (searchParams, headers) {
		var range = getRangeFromSearchParams(searchParams);
		var idPrefix = 'parent' in searchParams ?
			searchParams.parent === 'undefined' ? '' : (searchParams.parent + '-') : '';
		var data = [];
		var i;

		if (!range) {
			range = getRangeFromHeaders(headers);

			if (!('start' in range)) {
				range.start = 0;
			}
			if (!('end' in range)) {
				range.end = 40;
			}
		}

		range.end = Math.min(range.end, TOTAL_ITEM_COUNT);

		for (i = range.start; i < range.end; i++) {
			data.push({
				id: idPrefix + i,
				name: (idPrefix ? ('Child ' + idPrefix) : 'Item ') + i,
				comment: 'hello'
			});
		}

		return {
			items: data,
			contentRange: 'items ' + range.start + '-' + range.end + '/' + TOTAL_ITEM_COUNT
		};
	}

	return {
		getDelay: getDelay,
		getRangeFromHeaders: getRangeFromHeaders,
		getRangeFromSearchParams: getRangeFromSearchParams,
		getResponseData: getResponseData
	};
}));
