define([
	'./stateData'
], function (stateData) {

	var states = stateData.items;
	function getRandomStateAbbreviation() {
		return states[Math.floor(Math.random() * states.length)].abbreviation;
	}

	var typesData = [];
	for (var i = 0; i < 12; i++) {
		typesData.push({
			id: i,
			integer: Math.floor(Math.random() * 100),
			floatNum: Math.random() * 100,
			date: new Date(new Date().getTime() * Math.random() * 2),
			date2: new Date(new Date().getTime() - Math.random() * 1000000000),
			text: 'A number in text ' + Math.random(),
			text2: 'A number in text ' + Math.random(),
			bool: Math.random() > 0.5,
			bool2: Math.random() > 0.5,
			state: getRandomStateAbbreviation(),
			state2: getRandomStateAbbreviation()
		});
	}

	return { items: typesData };
});
