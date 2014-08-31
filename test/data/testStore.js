define([
	'./createSyncStore',
	'./genericData'
], function (createSyncStore, genericData) {
	return createSyncStore({ data: genericData });
});
