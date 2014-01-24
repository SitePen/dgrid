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
			kwArgs = lang.mixin({}, kwArgs);

			if(kwArgs.data.items){
				kwArgs.data.items = kwArgs.data.items.slice(0);
			}else{
				kwArgs.data = kwArgs.data.slice(0);
			}
		}

		return new ObservableMemory(kwArgs);
	};
});
