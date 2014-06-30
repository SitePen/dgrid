define([
	"dgrid/List",
	"dgrid/OnDemandGrid",
	"dgrid/Selection",
	"dgrid/Keyboard",
	"dgrid/extensions/ColumnHider",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/Stateful",
	"dgrid/demos/dTuned/data",
	"put-selector/put",
	"dojo/domReady!"
],
function(List, Grid, Selection, Keyboard, Hider, declare, arrayUtil, Stateful, songStore, put){
	// Create DOM
	var headerNode = put("div#header");
	var listNode = put("div#list-container");
	var genresNode = put(listNode, "div#genres");
	var artistsNode = put(listNode, "div#artists");
	var albumsNode = put(listNode, "div#albums");
	var gridNode = put("div#grid");

	put(document.body, headerNode, "div#header-content", "dTuned");
	put(document.body, listNode);
	put(document.body, gridNode);
	
	// a formatting function for the Duration column.
	function timeFormatter(t){
		var tmp = parseInt(t, 10);
		var min;
		var sec;

		if(isNaN(tmp)){
			return t;
		}

		min = Math.floor(tmp / 60);
		sec = tmp % 60;
		// don't forget to pad seconds.
		return "" + min + ":" + (sec < 10 ? "0" : "") + sec;
	}
	
	function unique(arr){
		// Create a unique list of items from the passed array
		// (removing duplicates).
		var ret = [];

		// First, set up a hashtable for unique objects.
		var obj = {};
		for(var i = 0, l = arr.length; i < l; i++){
			if(!(arr[i] in obj)){
				obj[arr[i]] = true;
			}
		}

		// Now push the unique objects back into an array, and return it.
		for(var p in obj){
			ret.push(p);
		}
		ret.sort();
		return ret;
	}

	function pickField(fieldName){
		return function(object){
			return object[fieldName];
		};
	}

	// Create the main grid to appear below the genre/artist/album lists.
	var grid = new (declare([Grid, Selection, Keyboard, Hider]))({
		collection: songStore,
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
	var genreList = unique(arrayUtil.map(songStore.fetch(), pickField('Genre')));
	var artistList = unique(arrayUtil.map(songStore.fetch(), pickField('Artist')));
	var albumList = unique(arrayUtil.map(songStore.fetch(), pickField('Album')));

	genreList.unshift("All (" + genreList.length + " Genre" + (genreList.length !== 1 ? "s" : "") + ")");
	artistList.unshift("All (" + artistList.length + " Artist" + (artistList.length !== 1 ? "s" : "") + ")");
	albumList.unshift("All (" + albumList.length + " Album" + (albumList.length !== 1 ? "s" : "") + ")");

	genres.renderArray(genreList);
	artists.renderArray(artistList);
	albums.renderArray(albumList);

	// As items are selected in each of the genre, artist, and album dgrid lists the
	// associated value will be set on this stateful object so the main grid can
	// watch for updates and filter accordingly
	var gridFilter = new Stateful();

	// This function is used further down by the select handler for the artists list.
	// It builds a filtered list of album names depending on the selected genre and artist.
	function getFilteredAlbumList(gridFilter, songStore, selectedArtist){
		var filterOptions = {};
		var filteredObjects;
		var filteredAlbumList;

		if(gridFilter.get('Genre')){
			filterOptions.Genre = gridFilter.get('Genre');
		}

		if(selectedArtist){
			filterOptions.Artist = selectedArtist;
		}
		filteredObjects = songStore.filter(filterOptions).fetch();
		filteredAlbumList = unique(arrayUtil.map(filteredObjects, pickField('Album')));
		filteredAlbumList.unshift("All (" + filteredAlbumList.length + " Album" + (filteredAlbumList.length !== 1 ? "s" : "") + ")");

		return filteredAlbumList;
	}

	gridFilter.watch(function(){
		var filter;

		if(this.Genre || this.Artist || this.Album){
			filter = {};

			if(this.Genre){
				filter.Genre = this.Genre;
			}
			if(this.Artist){
				filter.Artist = this.Artist;
			}
			if(this.Album){
				filter.Album = this.Album;
			}

			grid.set('collection', songStore.filter(filter));
		}
		else{
			if(grid.collection !== songStore){
				grid.set('collection', songStore);
			}
		}
	});

	// start listening for selections on the lists.
	genres.on("dgrid-select", function(event){
		// filter the albums, artists and grid
		var row = event.rows[0];
		var selectedGenre = row.data;
		var filteredObjects;
		var filteredArtistList;

		if(row.id == "0"){
			// remove filtering
			gridFilter.set('Genre', undefined);
			filteredArtistList = artistList;
		}
		else {
			gridFilter.set('Genre', selectedGenre);
			// filter the store on the current genre
			filteredObjects = songStore.filter({ Genre: selectedGenre }).fetch();
			// map the full album objects to a unique array of artist names (strings)
			filteredArtistList = unique(arrayUtil.map(filteredObjects, pickField('Artist')));
			// add the "All" option at the top
			filteredArtistList.unshift("All (" + filteredArtistList.length + " Artist" + (filteredArtistList.length !== 1 ? "s" : "") + ")");
		}
		
		artists.refresh();	// clear contents
		artists.renderArray(filteredArtistList);
		artists.select(0); // reselect "all", triggering albums+grid refresh
	});

	artists.on("dgrid-select", function(event){
		// filter the albums, grid
		var row = event.rows[0];
		var selectedArtist = row.data;
		var filteredAlbumList;

		if(row.id == "0"){
			gridFilter.set('Artist', undefined);

			if(gridFilter.get('Genre')){
				// filter only by genre
				filteredAlbumList = getFilteredAlbumList(gridFilter, songStore);
			} else {
				// remove filtering entirely
				filteredAlbumList = albumList;
			}
		}
		else {
			// create filter based on artist
			gridFilter.set('Artist', selectedArtist);
			filteredAlbumList = getFilteredAlbumList(gridFilter, songStore, selectedArtist);
		}

		albums.refresh(); // clear contents
		albums.renderArray(filteredAlbumList);
		albums.select(0); // reselect "all" item, triggering grid refresh
	});

	albums.on("dgrid-select", function(event){
		// filter the grid
		var row = event.rows[0];
		var selectedAlbum = row.data;

		if(row.id == "0"){
			// show all albums
			gridFilter.set('Album', undefined);
		} else {
			gridFilter.set('Album', selectedAlbum);
		}
	});

	// set the initial selections on the lists.
	genres.select(0);
});