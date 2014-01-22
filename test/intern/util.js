define([
	"dojo/Deferred",
	"dojo/node!wd/lib/special-keys",
], function (Deferred, specialKeys) {
	return {
		/**
		 Tests for browser/WebDriver support of shift+click.
		 This is known to not work in multiple Firefox releases prior to 27 with Selenium's
		 Firefox driver.
		 * @param {PromisedWebDriver} remote A webdriver instance with a remote page already loaded
		 * @returns {Promise} A promise that is resolved if shift+click is supported; otherwise rejected
		 */
		isShiftClickSupported: function(remote) {
			var dfd = new Deferred();

			remote.execute("window.isShiftClickSupported = false;" +
				"var button = document.createElement('button');" +
				"button.onclick = function (event) { " +
					"window.shiftClickTestButtonClicked = true;" +
					"window.isShiftClickSupported = event.shiftKey;" +
				"};" +
				"button.id = 'shiftClickTestButton';" +
				"document.body.appendChild(button);"
			);
			remote.waitForElementById("shiftClickTestButton");
			remote.keys(specialKeys.Shift);
			remote.elementById("shiftClickTestButton");
			remote.clickElement();
			remote.keys(specialKeys.NULL);
			remote.end();

			remote.waitForCondition("shiftClickTestButtonClicked", 5000);
			remote.execute("document.body.removeChild(document.getElementById('shiftClickTestButton'));" +
				"return window.isShiftClickSupported;"
			);
			remote.then(function (isShiftClickSupported) {
				if (isShiftClickSupported) {
					dfd.resolve();
				}
				else {
					dfd.reject();
				}
			});

			return dfd.promise;
		}
	};
});
