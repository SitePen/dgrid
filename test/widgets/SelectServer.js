define([
	'dojo/Deferred',
	'dojo/io-query',
	'dojo/on',
	'dojo/request/registry',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'../data/restMock',
	'dojo/text!./SelectServer.html'
], function (Deferred, ioQuery, on, requestRegistry, _WidgetBase, _TemplatedMixin, restMock, template) {
	var NODEJS_TARGET_URL = window.location.origin + ':8040/data/rest';
	var PHP_TARGET_URL = '../data/rest.php';
	var TIMEOUT = 1500; // milliseconds; timeout for server up status check

	return _WidgetBase.createSubclass([ _TemplatedMixin ], {
		templateString: template,

		postCreate: function () {
			this.inherited(arguments);

			this.own(on(this.form, 'change', function (event) {
				if (event.target.value === 'mock') {
					window.location.assign(window.location.origin + window.location.pathname);
				}
				else {
					window.location.assign('?server=' + event.target.value);
				}
			}));
		},

		startup: function () {
			var startupDfd = new Deferred();
			this.startupPromise = startupDfd.promise;

			this.inherited(arguments);

			var self = this;
			var searchParams = ioQuery.queryToObject(window.location.search.slice(1));
			var value = searchParams.server;

			if (value) {
				this.form.serverType.value = value;
			}
			else {
				value = 'mock';
			}

			if (value === 'mock') {
				requestRegistry.register(/data\/rest/, restMock);
				startupDfd.resolve();
			}
			else {
				requestRegistry.get(this.get('targetUrl') + '?limit(1)', {
					timeout: TIMEOUT
				}).response.then(function (response) {
					var contentType = response.getHeader('Content-Type');
					// If PHP is not running or configured correctly `rest.php` may be served by a plain HTTP server
					// as text or html. The PHP script is configured to set Content-Type to 'application/json'
					if (contentType !== 'application/json') {
						throw { response: response };
					}
					startupDfd.resolve(response);
				}).otherwise(function (error) {
					var message = 'Failed to load data from URL: ' + error.response.url + '<br>';
					if (value === 'php') {
						message += 'PHP must be running and configured to execute the script <code>dgrid/test/data/rest.php</code>';
					}
					else {
						message += 'The Node.js server must be running: <code>npm run test-server</code>';
					}
					self.messageNode.innerHTML = message;
					self.messageNode.style.display = 'inline-block';
				});
			}
		},

		_getTargetUrlAttr: function () {
			var targetUrl = NODEJS_TARGET_URL;
			var value = this.get('value');

			if (value === 'php') {
				targetUrl = PHP_TARGET_URL;
			}

			return targetUrl;
		},

		_getValueAttr: function () {
			return this.form.serverType.value;
		}
	});
});
