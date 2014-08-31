/* jshint maxlen: 150 */
define([], function () {
	var items = [
		{ id: 'AF', name: 'Africa', type: 'continent', population: '900 million', area: '30,221,532 sq km',
			timezone: '-1 UTC to +4 UTC'},
		{ id: 'EG', name: 'Egypt', type: 'country', parent: 'AF' },
		{ id: 'Cairo', name: 'Cairo', type: 'city', parent: 'EG' },
		{ id: 'KE', name: 'Kenya', type: 'country', parent: 'AF'},
		{ id: 'Nairobi', name: 'Nairobi', type: 'city', parent: 'KE' },
		{ id: 'Mombasa', name: 'Mombasa', type: 'city', parent: 'KE' },
		{ id: 'SD', name: 'Sudan', type: 'country', parent: 'AF'},
		{ id: 'Khartoum', name: 'Khartoum', type: 'city', parent: 'SD' },

		{ id: 'AS', name: 'Asia', type: 'continent', population: '3.2 billion'},
		{ id: 'CN', name: 'China', type: 'country', parent: 'AS' },
		{ id: 'Shanghai', name: 'Shanghai', type: 'city', parent: 'CN' },
		{ id: 'IN', name: 'India', type: 'country', parent: 'AS' },
		{ id: 'Calcutta', name: 'Calcutta', type: 'city', parent: 'IN' },
		{ id: 'RU', name: 'Russia', type: 'country', parent: 'AS' },
		{ id: 'Moscow', name: 'Moscow', type: 'city', parent: 'RU' },
		{ id: 'MN', name: 'Mongolia', type: 'country', parent: 'AS' },
		{ id: 'UlanBator', name: 'Ulan Bator', type: 'city', parent: 'MN' },

		{ id: 'OC', name: 'Oceania', type: 'continent', population: '21 million'},
		{ id: 'AU', name: 'Australia', type: 'country', population: '21 million', parent: 'OC' },
		{ id: 'Sydney', name: 'Sydney', type: 'city', parent: 'AU' },

		{ id: 'EU', name: 'Europe', type: 'continent', population: '774 million' },
		{ id: 'DE', name: 'Germany', type: 'country', parent: 'EU' },
		{ id: 'Berlin', name: 'Berlin', type: 'city', parent: 'DE' },
		{ id: 'FR', name: 'France', type: 'country', parent: 'EU' },
		{ id: 'Paris', name: 'Paris', type: 'city', parent: 'FR' },
		{ id: 'ES', name: 'Spain', type: 'country', parent: 'EU' },
		{ id: 'Madrid', name: 'Madrid', type: 'city', parent: 'ES' },
		{ id: 'IT', name: 'Italy', type: 'country', parent: 'EU' },
		{ id: 'Rome', name: 'Rome', type: 'city', parent: 'IT' },

		{ id: 'NA', name: 'North America', type: 'continent', population: '575 million'},
		{ id: 'MX', name: 'Mexico', type: 'country',  population: '108 million', area: '1,972,550 sq km', parent: 'NA' },
		{ id: 'Mexico City', name: 'Mexico City', type: 'city', population: '19 million', timezone: '-6 UTC', parent: 'MX'},
		{ id: 'Guadalajara', name: 'Guadalajara', type: 'city', population: '4 million', timezone: '-6 UTC', parent: 'MX' },
		{ id: 'CA', name: 'Canada', type: 'country',  population: '33 million', area: '9,984,670 sq km', parent: 'NA' },
		{ id: 'Ottawa', name: 'Ottawa', type: 'city', population: '0.9 million', timezone: '-5 UTC', parent: 'CA'},
		{ id: 'Toronto', name: 'Toronto', type: 'city', population: '2.5 million', timezone: '-5 UTC', parent: 'CA' },
		{ id: 'US', name: 'United States of America', type: 'country', parent: 'NA' },
		{ id: 'New York', name: 'New York', type: 'city', parent: 'US' },

		{ id: 'SA', name: 'South America', type: 'continent', population: '445 million' },
		{ id: 'BR', name: 'Brazil', type: 'country', population: '186 million', parent: 'SA' },
		{ id: 'Brasilia', name: 'Brasilia', type: 'city', parent: 'BR' },
		{ id: 'AR', name: 'Argentina', type: 'country', population: '40 million', parent: 'SA' },
		{ id: 'BuenosAires', name: 'Buenos Aires', type: 'city', parent: 'AR' }
	];

	for (var i = 0; i < items.length; ++i) {
		items[i].hasChildren = items[i].type !== 'city';
	}

	return {
		identifier: 'id',
		items: items
	};
});
