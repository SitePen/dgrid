define([
	"dgrid/List",
	"dgrid/OnDemandGrid",
	"dgrid/Selection",
	"dgrid/Keyboard",
	"dgrid/extensions/ColumnHider",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dgrid/demos/dTuned/data",
	"put-selector/put",
	"dojo/domReady!"
],
function(List, Grid, Selection, Keyboard, Hider, declare, arrayUtil, songStore, put){
	// Create DOM
	var headerNode = put("div#header"),
		listNode = put("div#list-container"),
		genresNode = put(listNode, "div#genres"),
		artistsNode = put(listNode, "div#artists"),
		albumsNode = put(listNode, "div#albums"),
		gridNode = put("div#grid");
	put(document.body, headerNode, "div#header-content", "dTuned");
	put(document.body, listNode);
	put(document.body, gridNode);
	
	// a formatting function for the Duration column.
	var timeFormatter = function(t){
		var tmp = parseInt(t, 10), min, sec;
		if(isNaN(tmp)){ return t; }
		min = Math.floor(tmp/60);
		sec = tmp % 60;
		// don't forget to pad seconds.
		return "" + min + ":" + (sec < 10 ? "0" : "") + sec;
	};
	
	function unique(arr){
		// Create a unique list of items from the passed array
		// (removing duplicates).

		// First, set up a hashtable for unique objects.
		var obj = {};
		for(var i = 0,l = arr.length; i < l; i++){
			if(!(arr[i] in obj)){
				obj[arr[i]] = true;
			}
		}

		// Now push the unique objects back into an array, and return it.
		var ret = [];
		for(var p in obj){
			ret.push(p);
		}
		ret.sort();
		return ret;
	}


	// Create the main grid to appear below the genre/artist/album lists.
	var grid = new (declare([Grid, Selection, Keyboard, Hider]))({
		store: songStore,
		columns: {
			Name: "Name",
			Time: { label: "Duration", formatter: timeFormatter },
			Year: "Year",
			Artist: "Artist",
			Album: "Album",
			Genre: "Genre"
		}
	}, gridNode);

	// define a List constructor with the features we want mixed in,
	// for use by the three lists in the top region
	var TunesList = declare([List, Selection, Keyboard]);

	// define our three lists for the top.
	var genres = new TunesList({ selectionMode: "single" }, genresNode);
	var artists = new TunesList({ selectionMode: "single" }, artistsNode);
	var albums = new TunesList({ selectionMode: "single" }, albumsNode);

	// create the unique lists and render them
	var g = unique(arrayUtil.map(songStore.data, function(item){ return item.Genre; })),
		art = unique(arrayUtil.map(songStore.data, function(item){ return item.Artist; })),
		alb = unique(arrayUtil.map(songStore.data, function(item){ return item.Album; }));
	g.unshift("All (" + g.length + " Genre" + (g.length !== 1 ? "s" : "") + ")");
	art.unshift("All (" + art.length + " Artist" + (art.length !== 1 ? "s" : "") + ")");
	alb.unshift("All (" + alb.length + " Album" + (alb.length !== 1 ? "s" : "") + ")");
	genres.renderArray(g);
	artists.renderArray(art);
	albums.renderArray(alb);

	var currentGenre; // updated on genre select

	// start listening for selections on the lists.
	genres.on("dgrid-select", function(e){
		// filter the albums, artists and grid
		var row = e.rows[0],
			filter = currentGenre = row.data,
			art;
		if(row.id == "0"){
			// remove filtering
			art = unique(arrayUtil.map(songStore.data, function(item){ return item.Artist; }));
			grid.query = {};
		} else {
			// create filtering
			art = unique(arrayUtil.map(arrayUtil.filter(songStore.data, function(item){ return item.Genre === filter; }), function(item){ return item.Artist; }));
			grid.query = { "Genre": filter };
		}
		art.unshift("All (" + art.length + " Artist" + (art.length !== 1 ? "s" : "") + ")");
		
		artists.refresh();	// clear contents
		artists.renderArray(art);
		artists.select(0); // reselect "all", triggering albums+grid refresh
	});

	artists.on("dgrid-select", function(e){
		// filter the albums, grid
		var row = e.rows[0],
			filter = row.data, alb;
		if(row.id == "0"){
			if(genres.selection[0]){
				// remove filtering entirely
				alb = unique(arrayUtil.map(songStore.data, function(item){ return item.Album; }));
			} else {
				// filter only by genre
				alb = unique(arrayUtil.map(arrayUtil.filter(songStore.data, function(item){ return item.Genre === currentGenre; }), function(item){ return item.Album; }));
			}
			delete grid.query.Artist;
		} else {
			// create filter based on artist
			alb = unique(arrayUtil.map(arrayUtil.filter(songStore.data, function(item){ return item.Artist === filter; }), function(item){ return item.Album; }));
			grid.query.Artist = filter;
		}
		alb.unshift("All (" + alb.length + " Album" + (alb.length !== 1 ? "s" : "") + ")");

		albums.refresh(); // clear contents
		albums.renderArray(alb);
		albums.select(0); // reselect "all" item, triggering grid refresh
	});

	albums.on("dgrid-select", function(e){
		// filter the grid
		var row = e.rows[0],
			filter = row.data;
		if(row.id == "0"){
			// show all albums
			delete grid.query.Album;
		} else {
			grid.query.Album = filter;
		}
		grid.refresh();
	});

	// set the initial selections on the lists.
	genres.select(0);
});