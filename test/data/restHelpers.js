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
	var limitRegex = /^limit\((\d+),*(\d+)*\)/;
	var rangeHeaderRegex = /(\d+)-(\d+)/;

	function getRangeFromHeaders (headers) {
		var rangeString = headers && (headers.Range || headers.range || headers['X-Range'] || headers['x-range']);
		var match;
		var range;

		if (rangeString) {
			match = rangeHeaderRegex.exec(rangeString);
			if (match && match[2]) {
				range = {
					start: parseInt(match[1], 10),
					end: parseInt(match[2], 10) + 1
				};
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

	return {
		getRangeFromHeaders: getRangeFromHeaders,
		getRangeFromSearchParams: getRangeFromSearchParams
	};
}));
