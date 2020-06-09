/* jshint node:true */

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-contrib-watch');

	// grunt-contrib-stylus does not appear to support globbed destination filenames,
	// so generate the desired destination/source configuration ahead of time
	var stylusFiles = grunt.file.expand([
		'css/dgrid.styl',
		'css/skins/*.styl',
		'!css/skins/skin.styl'
	]);
	var stylusFilesConfig = {};
	stylusFiles.forEach(function (filename) {
		stylusFilesConfig[filename.slice(0, -5) + '.css'] = filename;
	});

	grunt.initConfig({
		clean: {
			css: {
				src: [ 'css/**/*.css' ]
			}
		},

		stylus: {
			options: {
				compress: false,
				use: [ require('nib') ]
			},

			compile: {
				files: stylusFilesConfig
			}
		},

		watch: {
			stylus: {
				files: [ 'css/**/*.styl' ],
				tasks: [ 'stylus' ]
			}
		}
	});

	grunt.registerTask('default', [ 'stylus', 'watch:stylus' ]);
};
