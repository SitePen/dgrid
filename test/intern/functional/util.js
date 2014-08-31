define([
	'intern/dojo/node!leadfoot/helpers/pollUntil',
	'intern/dojo/node!leadfoot/keys',
	'intern/dojo/node!leadfoot/Command'
], function (pollUntil, keys, Command) {
	return {
		isShiftClickSupported: function (remote) {
			// summary:
			//		Detects browser/WebDriver support of shift+click.
			//		This is known to not work in many versions of IE & FF with
			//		Selenium's drivers.
			// remote: PromisedWebDriver
			//		A webdriver instance with a remote page already loaded
			// returns:
			//		A promise that resolves to a boolean

			return remote.execute(function () {
					window.isShiftClickSupported = false;
					var button = document.createElement('button');
					button.id = 'shiftClickTestButton';
					button.onclick = function (event) {
						window.shiftClickTestButtonClicked = true;
						window.isShiftClickSupported = event.shiftKey;
					};
					document.body.appendChild(button);
				})
				.pressKeys(keys.SHIFT)
					.findById('shiftClickTestButton')
					.click()
					.pressKeys(keys.NULL)
					.end()
				.then(pollUntil(function () {
					return window.shiftClickTestButtonClicked;
				}, null, 5000))
				.execute(function () {
					document.body.removeChild(document.getElementById('shiftClickTestButton'));
					return window.isShiftClickSupported;
				});
		},

		isInputHomeEndSupported: function (remote) {
			// summary:
			//		Detects whether the given browser/OS combination supports
			//		using the home and end keys to move the caret in a textbox.
			// remote: PromisedWebDriver
			//		A webdriver instance with a remote page already loaded
			// returns:
			//		A promise that resolves to a boolean

			return remote.execute(function () {
					var input = document.createElement('input');
					input.id = 'homeEndTestInput';
					input.value = '2';
					document.body.appendChild(input);
				})
				.findById('homeEndTestInput')
					.click()
					.type(keys.END + '3' + keys.HOME + '1')
					.end()
				.execute(function () {
					var input = document.getElementById('homeEndTestInput'),
						value = input.value;
					document.body.removeChild(input);
					return value === '123';
				});
		},

		createCommandConstructor: function (members) {
			// summary:
			//		Creates a custom Command constructor extended with the
			//		provided members.  Based on Leadfoot's Command documentation:
			//		http://theintern.github.io/leadfoot/Command.html

			function CustomCommand() {
				Command.apply(this, arguments);
			}
			CustomCommand.prototype = Object.create(Command.prototype);
			CustomCommand.prototype.constructor = CustomCommand;

			Object.keys(members).forEach(function (name) {
				CustomCommand.prototype[name] = members[name];
			});

			return CustomCommand;
		}
	};
});
