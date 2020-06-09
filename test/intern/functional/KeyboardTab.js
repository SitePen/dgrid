/* jshint -W024 */
var keys = require('@theintern/leadfoot/keys').default;
var pollUntil = require('@theintern/leadfoot/helpers/pollUntil').default;
/* jshint +W024 */
var tdd = intern.getPlugin('interface.tdd');
var assert = intern.getPlugin('chai').assert;
var tabKey = keys.TAB;

tdd.suite('Keyboard tab key functional tests', function () {
	tdd.before(function (suite) {
		// Get our html page. This page should load all necessary scripts
		// since this functional test module runs on the server and can't load
		// such scripts. Further, in the html page, set a global "ready" var
		// to true to tell the runner to continue.
		return suite.remote
			.get('dgrid/test/intern/functional/KeyboardTab.html')
			.then(pollUntil(function () {
				return window.ready;
			}, null, 5000));
	});

	tdd.test('grids with and without headers -> tab key', function (suite) {
		return suite.remote
			.getActiveElement()
				.getAttribute('id')
				.then(function (id) {
					assert.strictEqual(id, 'showHeaderButton', 'Focus is on the button: ' + id);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'columnheader', 'Focus is on a column header: ' + role);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'gridcell', 'Focus is on a grid cell: ' + role);
				})
				.getVisibleText()
				.then(function (text) {
					assert.strictEqual(text, '0', 'The cell with focus contains 0: ' + text);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'gridcell', 'Focus is on a grid cell: ' + role);
				})
				.getVisibleText()
				.then(function (text) {
					assert.strictEqual(text, '10', 'The cell with focus contains 10: ' + text);
				})
				.end()
			.findById('showHeaderButton')
				.click()
				.end()
			.getActiveElement()
				.getAttribute('id')
				.then(function (id) {
					assert.strictEqual(id, 'showHeaderButton', 'Focus is on the button: ' + id);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'columnheader', 'Focus is on a column header: ' + role);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'gridcell', 'Focus is on a grid cell: ' + role);
				})
				.getVisibleText()
				.then(function (text) {
					assert.strictEqual(text, '0', 'The cell with focus contains 0: ' + text);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'columnheader', 'Focus is on a column header: ' + role);
				})
				.type(tabKey)
				.end()
			.getActiveElement()
				.getAttribute('role').then(function (role) {
					assert.strictEqual(role, 'gridcell', 'Focus is on a grid cell: ' + role);
				})
				.getVisibleText()
				.then(function (text) {
					assert.strictEqual(text, '10', 'The cell with focus contains 10: ' + text);
				});
	});
});
