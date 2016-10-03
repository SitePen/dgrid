define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/on',
	'dgrid/List',
	'dgrid/util/misc'
], function (test, assert, on, List, miscUtil) {
	test.suite('List', function() {
		test.suite('resize', function() {
			var list;

			test.afterEach(function() {
				if (list && list._started) {
					list.destroy();
				}
			});

			test.test('default throttle', function() {
				var originalThrottleDelayed = miscUtil.throttleDelayed;
				var throttleCalled = false;

				miscUtil.throttleDelayed = function() {
					return function() {
						throttleCalled = true;
					};
				};

				try {
					list = new List();

					document.body.appendChild(list.domNode);
					// necessary to start up list since resize handler only runs if list is started up
					list.startup();

					on.emit(window, 'resize', {});
					assert.isTrue(throttleCalled, 'Default window resize handler should be called');
				}
				finally {
					miscUtil.throttleDelayed = originalThrottleDelayed;
				}
			});

			test.test('custom throttle: string', function() {
				var originalDebounce = miscUtil.debounce;
				var throttleCalled = false;

				miscUtil.debounce = function() {
					return function() {
						throttleCalled = true;
					};
				};

				try {
					list = new List({
						resizeThrottleMethod: 'debounce'
					});

					document.body.appendChild(list.domNode);
					list.startup();

					on.emit(window, 'resize', {});
					assert.isTrue(throttleCalled, 'Configured window resize handler should be called');
				}
				finally {
					miscUtil.debounce = originalDebounce;
				}
			});

			test.test('custom throttle: invalid string', function() {
				var originalThrottleDelayed = miscUtil.throttleDelayed;
				var throttleCalled = false;

				miscUtil.throttleDelayed = function() {
					return function() {
						throttleCalled = true;
					};
				};

				try {
					list = new List({
						resizeThrottleMethod: 'not a valid throttle function name'
					});

					document.body.appendChild(list.domNode);
					list.startup();

					on.emit(window, 'resize', {});
					assert.isTrue(throttleCalled, 'Default window resize handler should be called');
				}
				finally {
					miscUtil.throttleDelayed = originalThrottleDelayed;
				}
			});

			test.test('custom throttle: function', function() {
				var throttleCalled = false;
				var throttleDelay;

				list = new List({
					resizeThrottleMethod: function(callback, delay) {
						throttleDelay = delay;

						return function() {
							throttleCalled = true;
						};
					}
				});

				document.body.appendChild(list.domNode);
				list.startup();

				assert.strictEqual(miscUtil.defaultDelay, throttleDelay, 'Custom throttle function should receive delay value');

				on.emit(window, 'resize', {});
				assert.isTrue(throttleCalled, 'Custom window resize handler should be called');
			});
		});
	});
});
