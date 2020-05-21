/*
A simple test server that returns dynamic data.
Sort: not supported
Paging: supports both "limit(count,start)" in the querystring and Range/X-Range header: items=start-end
Hierarchical data: supports the "parent" parameter in the querystring
See: https://github.com/SitePen/dstore/blob/master/docs/Stores.md#request

Launch command: node rest-node.js
Stop server with Ctrl+C
*/

var http = require('http');
var process = require('process');
var url = require('url');
var restHelpers = require('./restHelpers');

var PORT_NUMBER = 8040;
var RESPONSE_DELAY_MIN = 20;
var RESPONSE_DELAY_MAX = 100;
var TOTAL_ITEM_COUNT = 500;

var server = http.createServer(function (request, response) {
	var requestUrl = new url.URL(request.url, 'http://' + request.headers.host);
	var searchParams = {};
	requestUrl.searchParams.forEach(function (value, name) {
		searchParams[name] = value;
	});
	var range = restHelpers.getRangeFromSearchParams(searchParams);
	var idPrefix = 'parent' in searchParams ?
		searchParams.parent === 'undefined' ? '' : (searchParams.parent + '-') : '';
	var data = [];
	var responseDelay = RESPONSE_DELAY_MAX ?
		Math.floor(Math.random() * ((RESPONSE_DELAY_MAX - RESPONSE_DELAY_MIN) + 1)) + 50 :
		0;
	var i;

	if (!range) {
		range = Object.assign({
			start: 0,
			end: 40
		}, restHelpers.getRangeFromHeaders(request.headers));
	}

	range.end = Math.min(range.end, TOTAL_ITEM_COUNT);

	for (i = range.start; i < range.end; i++) {
		data.push({
			id: idPrefix + i,
			name: (idPrefix ? ('Child ' + idPrefix) : 'Item ') + i,
			comment: 'hello'
		});
	}

	response.setHeader('Access-Control-Allow-Headers', '*');
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Expose-Headers', 'Content-Range');
	response.setHeader('Content-Type', 'application/json');
	response.setHeader('Content-Range', 'items ' + range.start + '-' + range.end + '/' + TOTAL_ITEM_COUNT);
	response.write(JSON.stringify(data));

	if (responseDelay) {
		setTimeout(function () {
			response.end();
		}, responseDelay);
	}
	else {
		response.end();
	}
});

server.listen(PORT_NUMBER);
console.log('server listening on port ' + PORT_NUMBER + '...');

if (process.platform === 'win32') {
	var readline = require('readline');
	var readlineInterface = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	readlineInterface.on('SIGINT', function () {
		process.emit('SIGINT');
	});
}

process.on('SIGINT', function () {
	server.close(function () {
		console.log('server stopped');
		process.exit();
	});
});
