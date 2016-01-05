define([
	'./intern'
], function (intern) {

	intern.environments = [
		{ browserName: 'internet explorer', version: ['9.0', '10.0', '11.0'], platform: 'Windows 7' },
		/* Intern 3.0.6 sometimes works on Edge */
		{ browserName: 'microsoftedge', platform: 'Windows 10' },
		{ browserName: 'firefox', platform: 'Windows 10' },
		{ browserName: 'chrome', platform: 'Windows 10' },
		/* Still appear to be issues on Safari on SauceLabs */
		/* { browserName: 'safari', version: '9', platform: 'OS X 10.11' },*/
		{ browserName: 'android', platform: 'Linux', version: '4.4', deviceName: 'Google Nexus 7 HD Emulator' }/*,
		 { browserName: 'iphone', version: '9.1', deviceName: 'iPhone 6' }*/
	];

	/* SauceLabs supports more max concurrency */
	intern.maxConcurrency = 4;

	intern.tunnel = 'SauceLabsTunnel';
});

