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
		{ col1: "note", col2: false, col3: "replied", col4: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris', col5: 12.15, col6: -4, col7: false }
	];

	var rows = 100;
	for(var i=0, l=data_list.length; i<rows; i++){
		data.items.push(dojo.mixin({ id: i }, data_list[i%l]));
	}

	// global var testStore
	testStore = Observable(Memory({data: data}));

	//sample color data
	data2 = {
		identifier: 'id',
		label: 'id',
		items: []
	};
	colors = [
		{ col1: "Red", col2: false, col3: "Primary", col4: 'A primary color', col5: 255, col6: 0, col7: 0 },
		{ col1: "Yellow", col2: false, col3: "Primary", col4: 'A primary color', col5: 255, col6: 255, col7: 0 },
		{ col1: "Blue", col2: false, col3: "Primary", col4: 'A primary color', col5: 0, col6: 0, col7: 255 },
		{ col1: "Orange", col2: false, col3: "Secondary", col4: 'A Secondary color', col5: 255, col6: 165, col7: 0 },
		{ col1: "Purple", col2: false, col3: "Secondary", col4: 'A Secondary color', col5: 160, col6: 32, col7: 240 },
		{ col1: "Green", col2: false, col3: "Secondary", col4: 'A Secondary color', col5: 0, col6: 192, col7: 0 },
		{ col1: "Pink", col2: false, col3: "Hue", col4:'A hue' , col5: 255, col6: 192, col7: 203 }
	];

	for(var i=0, l=colors.length; i<rows; i++){
		data2.items.push(dojo.mixin({ id: i }, colors[i%l]));
	}

	// global var colorStore
	colorStore = Observable(Memory({data: data2}));

	//empty store
	emptyData = { identifier: 'id', label: 'id', items:[]};
	emptyStore = Observable(Memory({data: emptyData}));

	//store with non-existent url
	errorStore = Observable(Memory({url: "../../junkurl.json"}));

	var typesData = [];
	for(var i = 0; i < 20; i++){
		typesData.push({
			id: i,
			integer: Math.floor(Math.random() * 100),
			floatNum: Math.random() * 100,
			date: new Date(new Date().getTime() * Math.random() * 2),
			date2: new Date(new Date().getTime() - Math.random() * 1000000000),
			text: "A number in text " + Math.random(),
			bool: Math.random() > 0.5,
			bool2: Math.random() > 0.5
		});
	}
	// global var testTypesStore
	testTypesStore = Observable(Memory({data: typesData}));

	// global var testCountryStore
	testCountryStore = Observable(new Memory({
		data: [
			{ id: 'AF', name:'Africa', type:'continent', population:'900 million', area: '30,221,532 sq km',
					timezone: '-1 UTC to +4 UTC'},
				{ id: 'EG', name:'Egypt', type:'country', parent: 'AF' },
				{ id: 'KE', name:'Kenya', type:'country', parent: 'AF'},
					{ id: 'Nairobi', name:'Nairobi', type:'city', parent: 'KE' },
					{ id: 'Mombasa', name:'Mombasa', type:'city', parent: 'KE' },
				{ id: 'SD', name:'Sudan', type:'country', parent: 'AF'},
					{ id: 'Khartoum', name:'Khartoum', type:'city', parent: 'SD' },
				{ id: 'AS', name:'Asia', type:'continent'},
					{ id: 'CN', name:'China', type:'country', parent: 'AS' },
					{ id: 'IN', name:'India', type:'country', parent: 'AS' },
					{ id: 'RU', name:'Russia', type:'country', parent: 'AS' },
					{ id: 'MN', name:'Mongolia', type:'country', parent: 'AS' },
				{ id: 'OC', name:'Oceania', type:'continent', population:'21 million'},
				{ id: 'AU', name:'Australia', type:'country', population:'21 million', parent: 'OC' },
				{ id: 'EU', name:'Europe', type:'continent' },
				{ id: 'DE', name:'Germany', type:'country', parent: 'EU' },
				{ id: 'FR', name:'France', type:'country', parent: 'EU' },
				{ id: 'ES', name:'Spain', type:'country', parent: 'EU' },
				{ id: 'IT', name:'Italy', type:'country', parent: 'EU' },
			{ id: 'NA', name:'North America', type:'continent'},
				{ id: 'MX', name:'Mexico', type:'country',  population:'108 million', area:'1,972,550 sq km', parent: 'NA' },
					{ id: 'Mexico City', name:'Mexico City', type:'city', population:'19 million', timezone:'-6 UTC', parent: 'MX'},
					{ id: 'Guadalajara', name:'Guadalajara', type:'city', population:'4 million', timezone:'-6 UTC', parent: 'MX' },
				{ id: 'CA', name:'Canada', type:'country',  population:'33 million', area:'9,984,670 sq km', parent: 'NA' },
					{ id: 'Ottawa', name:'Ottawa', type:'city', population:'0.9 million', timezone:'-5 UTC', parent: 'CA'},
					{ id: 'Toronto', name:'Toronto', type:'city', population:'2.5 million', timezone:'-5 UTC', parent: 'CA' },
				{ id: 'US', name:'United States of America', type:'country', parent: 'NA' },
			{ id: 'SA', name:'South America', type:'continent' },
				{ id: 'BR', name:'Brazil', type:'country', population:'186 million', parent: 'SA' },
				{ id: 'AR', name:'Argentina', type:'country', population:'40 million', parent: 'SA' }
		],
		getChildren: function(parent, options){
			return this.query({parent: parent.id}, options);
		},
		mayHaveChildren: function(parent){
			return parent.type != "city";
		}
	}));
	
	function calculateOrder(store, object, before, orderField){
		// Calculates proper value of order for an item to be placed before another
		var afterOrder, beforeOrder = 0;
		if (!orderField) { orderField = "order"; }
		
		if(before){
			// calculate midpoint between two items' orders to fit this one
			afterOrder = before[orderField];
			store.query({}, {}).forEach(function(object){
				var ord = object[orderField];
				if(ord > beforeOrder && ord < afterOrder){
					beforeOrder = ord;
				}
			});
			return (afterOrder + beforeOrder) / 2;
		}else{
			// find maximum order and place this one after it
			afterOrder = 0;
			store.query({}, {}).forEach(function(object){
				var ord = object[orderField];
				if(ord > afterOrder){ afterOrder = ord; }
			});
			return afterOrder + 1;
		}
	}
	// global function createOrderedStore
	createOrderedStore = function(data){
		// Instantiate a Memory store modified to support ordering.
		return Observable(new Memory({data: data,
			idProperty: "name",
			put: function(object, options){
				object.order = calculateOrder(this, object, options.before);
				return Memory.prototype.put.call(this, object, options);
			},
			// Memory's add does not need to be augmented since it calls put
			copy: function(object, options){
				// summary:
				//		Given an item already in the store, creates a copy of it.
				//		(i.e., shallow-clones the item sans id, then calls add)
				var k, obj = {}, id, idprop = this.idProperty, i = 0;
				for (k in object){
					obj[k] = object[k];
				}
				// Ensure unique ID.
				// NOTE: this works for this example (where id's are strings);
				// Memory should autogenerate random numeric IDs, but
				// something seems to be falling through the cracks currently...
				id = object[idprop];
				if(id in this.index){
					// rev id
					while(this.index[id + "(" + (++i) + ")"]){}
					obj[idprop] = id + "(" + i + ")";
				}
				this.add(obj, options);
			},
			query: function(query, options){
				options.sort = [{attribute:"order"}];
				return Memory.prototype.query.call(this, query, options);
			}
		}));
	};
	// global var testOrderedData
	testOrderedData = [
		{order: 1, name:"preheat", description:"Preheat your oven to 350°F"},
		{order: 2, name:"mix dry", description:"In a medium bowl, combine flour, salt, and baking soda"},
		{order: 3, name:"mix butter", description:"In a large bowl, beat butter, then add the brown sugar and white sugar then mix"},
		{order: 4, name:"mix together", description:"Slowly add the dry ingredients from the medium bowl to the wet ingredients in the large bowl, mixing until the dry ingredients are totally combined"},
		{order: 5, name:"chocolate chips", description:"Add chocolate chips"},
		{order: 6, name:"make balls", description:"Scoop up a golf ball size amount of dough with a spoon and drop in onto a cookie sheet"},
		{order: 7, name:"bake", description:"Put the cookies in the oven and bake for about 10-14 minutes"},
		{order: 8, name:"remove", description:"Using a spatula, lift cookies off onto wax paper or a cooling rack"},
		{order: 9, name:"eat", description:"Eat and enjoy!"}
	];
	// global var testOrderedStore
	testOrderedStore = createOrderedStore(testOrderedData);
	return testStore;
});
