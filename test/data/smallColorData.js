define([
	'dojo/_base/lang'
], function (lang) {
	var colorData = {
		identifier: 'id',
		label: 'id',
		items: []
	};
	var colors = [
		{ col1: 'Red', col2: false, col3: 'Primary', col4: 'A primary color', col5: 255, col6: 0, col7: 0 },
		{ col1: 'Yellow', col2: false, col3: 'Primary', col4: 'A primary color', col5: 255, col6: 255, col7: 0 },
		{ col1: 'Blue', col2: false, col3: 'Primary', col4: 'A primary color', col5: 0, col6: 0, col7: 255 },
		{ col1: 'Orange', col2: false, col3: 'Secondary', col4: 'A Secondary color', col5: 255, col6: 165, col7: 0 },
		{ col1: 'Purple', col2: false, col3: 'Secondary', col4: 'A Secondary color', col5: 160, col6: 32, col7: 240 },
		{ col1: 'Green', col2: false, col3: 'Secondary', col4: 'A Secondary color', col5: 0, col6: 192, col7: 0 },
		{ col1: 'Pink', col2: false, col3: 'Hue', col4: 'A hue', col5: 255, col6: 192, col7: 203 }
	];

	for (var i = 0; i < colors.length; i++) {
		colorData.items.push(lang.mixin({ id: i }, colors[i]));
	}

	return colorData;
});
