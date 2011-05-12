// example sample data and code
define(["dojo/store/Memory", "dojo/store/Observable"],function(Memory, Observable){
	// some sample data
	// global var "data"
	data = {
		identifier: 'id',
		label: 'id',
		items: []
	};
	data_list = [ 
		{ col1: "normal", col2: false, col3: "new", col4: 'But are not followed by two hexadecimal', col5: 29.91, col6: 10, col7: false },
		{ col1: "important", col2: false, col3: "new", col4: 'Because a % sign always indicates', col5: 9.33, col6: -5, col7: false },
		{ col1: "important", col2: false, col3: "read", col4: 'Signs can be selectively', col5: 19.34, col6: 0, col7: true },
		{ col1: "note", col2: false, col3: "read", col4: 'However the reserved characters', col5: 15.63, col6: 0, col7: true },
		{ col1: "normal", col2: false, col3: "replied", col4: 'It is therefore necessary', col5: 24.22, col6: 5.50, col7: true },
		{ col1: "important", col2: false, col3: "replied", col4: 'To problems of corruption by', col5: 9.12, col6: -3, col7: true },
		{ col1: "note", col2: false, col3: "replied", col4: 'Which would simply be awkward in', col5: 12.15, col6: -4, col7: false }
	];
	var rows = 100;
	for(var i=0, l=data_list.length; i<rows; i++){
		data.items.push(dojo.mixin({ id: i }, data_list[i%l]));
	}

	// global var "test_store"
	testStore = Observable(Memory({data: data}));
	
	testCountryStore = Observable(new Memory({data: [
	        { id: 'AF', name:'Africa', type:'continent', population:'900 million', area: '30,221,532 sq km',
	        		timezone: '-1 UTC to +4 UTC',
	        		children:[{_reference:'EG'}, {_reference:'KE'}, {_reference:'SD'}] },
	        	{ id: 'EG', name:'Egypt', type:'country' },
	        	{ id: 'KE', name:'Kenya', type:'country',
	        			children:[{_reference:'Nairobi'}, {_reference:'Mombasa'}] },
	        		{ id: 'Nairobi', name:'Nairobi', type:'city' },
	        		{ id: 'Mombasa', name:'Mombasa', type:'city' },
	        	{ id: 'SD', name:'Sudan', type:'country',
	        			children:{_reference:'Khartoum'} },
	        		{ id: 'Khartoum', name:'Khartoum', type:'city' },
	        	{ id: 'AS', name:'Asia', type:'continent',
	        			children:[{_reference:'CN'}, {_reference:'IN'}, {_reference:'RU'}, {_reference:'MN'}] },
	        		{ id: 'CN', name:'China', type:'country' },
	        		{ id: 'IN', name:'India', type:'country' },
	        		{ id: 'RU', name:'Russia', type:'country' },
	        		{ id: 'MN', name:'Mongolia', type:'country' },
	        	{ id: 'OC', name:'Oceania', type:'continent', population:'21 million',
	        			children:{_reference:'AU'}},
	        	{ id: 'AU', name:'Australia', type:'country', population:'21 million'},
	        	{ id: 'EU', name:'Europe', type:'continent',
	        			children:[{_reference:'DE'}, {_reference:'FR'}, {_reference:'ES'}, {_reference:'IT'}] },
	        	{ id: 'DE', name:'Germany', type:'country' },
	        	{ id: 'FR', name:'France', type:'country' },
	        	{ id: 'ES', name:'Spain', type:'country' },
	        	{ id: 'IT', name:'Italy', type:'country' },
	        { id: 'NA', name:'North America', type:'continent',
	        		children:[{_reference:'MX'}, {_reference:'CA'}, {_reference:'US'}] },
	        	{ id: 'MX', name:'Mexico', type:'country',  population:'108 million', area:'1,972,550 sq km',
	        			children:[{_reference:'Mexico City'}, {_reference:'Guadalajara'}] },
	        		{ id: 'Mexico City', name:'Mexico City', type:'city', population:'19 million', timezone:'-6 UTC'},
	        		{ id: 'Guadalajara', name:'Guadalajara', type:'city', population:'4 million', timezone:'-6 UTC' },
	        	{ id: 'CA', name:'Canada', type:'country',  population:'33 million', area:'9,984,670 sq km',
	        			children:[{_reference:'Ottawa'}, {_reference:'Toronto'}] },
	        		{ id: 'Ottawa', name:'Ottawa', type:'city', population:'0.9 million', timezone:'-5 UTC'},
	        		{ id: 'Toronto', name:'Toronto', type:'city', population:'2.5 million', timezone:'-5 UTC' },
	        	{ id: 'US', name:'United States of America', type:'country' },
	        { id: 'SA', name:'South America', type:'continent',
	        		children:[{_reference:'BR'}, {_reference:'AR'}] },
	        	{ id: 'BR', name:'Brazil', type:'country', population:'186 million' },
	        	{ id: 'AR', name:'Argentina', type:'country', population:'40 million' }
		],
		getChildren: function(parent){
			var store = this;
			return dojo.map(parent.children, function(child){
				return store.get(child._reference);
			});
		},
		mayHaveChildren: function(parent){
			return parent.children;
		}
		}));

	testOrderedStore = Observable(new Memory({data: [
				{order: 1, name:"preheat", description:"Preheat your oven to 350°F"},
				{order: 2, name:"mix dry", description:"In a medium bowl, combine flour, salt, and baking soda"},
				{order: 3, name:"mix butter", description:"In a large bowl, beat butter, then add the brown sugar and white sugar then mix"},
				{order: 4, name:"mix together", description:"Slowly add the dry ingredients from the medium bowl to the wet ingredients in the large bowl, mixing until the dry ingredients are totally combined"},
				{order: 5, name:"chocolate chips", description:"Add chocolate chips"},
				{order: 6, name:"make balls", description:"Scoop up a golf ball size amount of dough with a spoon and drop in onto a cookie sheet"},
				{order: 7, name:"bake", description:"Put the cookies in the oven and bake for about 10-14 minutes"},
				{order: 8, name:"remove", description:"Using a spatula, lift cookies off onto wax paper or a cooling rack"},
				{order: 9, name:"eat", description:"Eat and enjoy!"}
			],
			idProperty: "name",
			put: function(object, options){
				if(options.before){
					object.order = options.before.order - 0.5;
				}
				return Memory.prototype.put.call(this, object, options);
			},
			query: function(query, options){
				options.sort = [{attribute:"order"}];
				return Memory.prototype.query.call(this, query, options);
			}
		}));
	return testStore;
});
