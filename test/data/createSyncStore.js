define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/Trackable'
], function (declare, lang, Memory, Trackable) {
	var TrackableMemory = declare([ Memory, Trackable ]);
	return function createSyncStore(kwArgs) {
		kwArgs = kwArgs || {};

		if (kwArgs.data) {
			kwArgs = lang.mixin({}, kwArgs, { data: lang.clone(kwArgs.data) });
		}

		return new TrackableMemory(kwArgs);
	};
});
