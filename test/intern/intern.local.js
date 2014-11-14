define([
	'./intern'
], function (intern) {
	intern.tunnel = 'NullTunnel';

	intern.environments = [
		// Enter whichever browser you want to test here.
		// (It is unwise to test more than one simultaneously on one host,
		// due to potential for spurious focus test failures.)
		{ browserName: 'chrome' }
	];

	return intern;
});