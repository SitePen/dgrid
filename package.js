var copyOnlyMids = {
	'dgrid/Gruntfile': 1,
	'dgrid/package': 1
};
var miniExcludeMids = {
	'dgrid/CHANGES.md': 1,
	'dgrid/LICENSE': 1,
	'dgrid/README.md': 1,
	'dgrid/Gruntfile': 1,
	'dgrid/package': 1
};

// jshint unused: false
var profile = {
	resourceTags: {
		copyOnly: function (filename, mid) {
			return mid in copyOnlyMids;
		},

		test: function (filename) {
			return /\/test\//.test(filename);
		},

		miniExclude: function (filename, mid) {
			return (/\/(?:test|demos)\//).test(filename) ||
				(/\.styl$/).test(filename) ||
			 	mid in miniExcludeMids;
		},

		amd: function (filename) {
			return (/\.js$/).test(filename);
		}
	}
};
