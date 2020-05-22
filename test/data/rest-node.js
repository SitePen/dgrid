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

var server = http.createServer(function (request, response) {
	var requestUrl = new url.URL(request.url, 'http://' + request.headers.host);
	var searchParams = {};
	requestUrl.searchParams.forEach(function (value, name) {
		searchParams[name] = value;
	});
	var responseData = restHelpers.getResponseData(searchParams, request.headers);
	var responseDelay = restHelpers.getDelay(RESPONSE_DELAY_MIN, RESPONSE_DELAY_MAX);

	response.setHeader('Access-Control-Allow-Headers', '*, Range, X-Range, X-Requested-With');
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Expose-Headers', 'Content-Range');
	response.setHeader('Content-Type', 'application/json');
	response.setHeader('Content-Range', responseData.contentRange);
	response.write(JSON.stringify(responseData.items));

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
