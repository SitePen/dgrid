define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dstore/Memory",
	"dstore/Observable"
], function(declare, lang, Memory, Observable){
	var ObservableMemory = declare([ Memory, Observable ]);
	return function createSyncStore(kwArgs){
		kwArgs = kwArgs || {};

		if(kwArgs.data){
			kwArgs = lang.mixin({}, kwArgs, { data: lang.clone(kwArgs.data) });
		}

		return new ObservableMemory(kwArgs);
	};
});
