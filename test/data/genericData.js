define([
	'dojo/_base/lang'
], function (lang) {
	var data = {
		identifier: 'id',
		label: 'id',
		items: []
	};
	/* jshint maxlen: 300 */
	var dataList = [
		{ col1: 'normal', col2: false, col3: 'new', col4: 'But are not followed by two hexadecimal', col5: 29.91, col6: 10, col7: false },
		{ col1: 'important', col2: false, col3: 'new', col4: 'Because a % sign always indicates', col5: 9.33, col6: -5, col7: false },
		{ col1: 'important', col2: false, col3: 'read', col4: 'Signs can be selectively', col5: 19.34, col6: 0, col7: true },
		{ col1: 'note', col2: false, col3: 'read', col4: 'However the reserved characters', col5: 15.63, col6: 0, col7: true },
		{ col1: 'normal', col2: false, col3: 'replied', col4: 'It is therefore necessary', col5: 24.22, col6: 5.50, col7: true },
		{ col1: 'important', col2: false, col3: 'replied', col4: 'To problems of corruption by', col5: 9.12, col6: -3, col7: true },
		{ col1: 'note', col2: false, col3: 'replied', col4: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris', col5: 12.15, col6: -4, col7: false }
	];

	var rows = 100;
	for (var i = 0, l = dataList.length; i < rows; i++) {
		data.items.push(lang.mixin({ id: i }, dataList[i % l]));
	}

	return data;
});
