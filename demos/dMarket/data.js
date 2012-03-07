define(["dojo/store/Memory", "dojo/store/Observable"], function(Memory, Observable){
	//	create some song data, and return a Memory Store from it.
	var store = new Memory({ data: [
		{ id: "aic", artist: "Alice in Chains", icon: "aic", album: "Alice in Chains",
			summary: "", price: "$2.74"
		},{ id: "jof", artist: "Alice in Chains", icon: "jar", album: "Jar of Flies",
			summary: "", price: "$1.54"
		},{
			id: "ava", artist: "Avalanches", icon: "avalanches", album: "Since I left you",
			summary: "", price: "$6.51"
		}, {
			id: "beck", artist: "Beck", icon: "guero", album: "Guero",
			summary: "", price: "$1.90"
		}, {
			id: "lmfao", artist: "LMFAO", icon: "lmfao", album: "Sorry For Party Rocking",
			summary: "", price: "$0.54"
		}, {
			id: "ma", artist: "Massive Attack", icon: "ma", album: "Blue Lines",
			summary: "", price: "$11.52"
		}, {
			id: "no", artist: "No Doubt", icon: "no_doubt", album: "Rock Steady",
			summary: "", price: "$1.22"
		}, {
			id: "pf", artist: "Pink Floyd", icon: "the_wall", album: "The Wall",
			summary: "", price: "$3.34"
		}, {
			id: "sp", artist: "Smashing Pumpkins", icon: "pumpkins", album: "Mellon Collie and the Infinite Sadness",
			summary: "", price: "$7.55"
		}
	] });
});
