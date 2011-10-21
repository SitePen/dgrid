define(["dojo/store/Memory", "dojo/store/Observable"],function(Memory, Observable){
	var perfData = [];
	for(var i = 0; i < 20000; i++){
		perfData.push({
			id: i,
			integer: Math.floor(Math.random() * 100),
			floatNum: Math.random() * 100,
			date: new Date(new Date().getTime() * Math.random() * 2),
			date2: new Date(new Date().getTime() - Math.random() * 1000000000),
			text: "A number in text " + Math.random(),
			bool: Math.random() > 0.5,
			bool2: Math.random() > 0.5,
			price: Math.random() * 100,
			today: new Date(new Date().getTime())
		});
	}
	return new Memory({data: perfData});
});