define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/Trackable'
], function (declare, lang, Memory, Trackable) {
	var TrackableMemory = declare([ Memory, Trackable ]);
	return function createSyncStore(kwArgs, Mixin) {
		kwArgs = kwArgs || {};

		if (kwArgs.data) {
			kwArgs = lang.mixin({}, kwArgs, { data: lang.clone(kwArgs.data) });
		}

		var Ctor = Mixin ? declare([TrackableMemory, Mixin]) : TrackableMemory;
		return new Ctor(kwArgs);
	};
});
