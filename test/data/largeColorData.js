define([
	'dojo/_base/lang',
	'./smallColorData'
], function (lang, smallColorData) {
	var colorData = {
		identifier: 'id',
		label: 'id',
		items: []
	};

	var rows = 100,
		colors = smallColorData.items;
	for (var i = 0, l = colors.length; i < rows; i++) {
		colorData.items.push(lang.mixin({}, colors[i % l], { id: i }));
	}

	return colorData;
});
