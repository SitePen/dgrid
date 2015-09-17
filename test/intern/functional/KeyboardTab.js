define([
	'intern!tdd',
	'intern/chai!assert',
	'intern/dojo/node!leadfoot/helpers/pollUntil',
	'intern/dojo/node!leadfoot/keys',
	'require'
], function (test, assert, pollUntil, keys, require) {
	var tabKey = keys.TAB;
	test.suite('Keyboard tab key functional tests', function () {
		test.before(function () {
			// Get our html page. This page should load all necessary scripts
			// since this functional test module runs on the server and can't load
			// such scripts. Further, in the html page, set a global "ready" var
			// to true to tell the runner to continue.
			return this.remote
				.get(require.toUrl('./KeyboardTab.html'))
				.then(pollUntil(function () {
					return window.ready;
				}, null, 5000));
		});

		test.test('grids with and without headers -> tab key', function () {
			return this.remote
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
});
