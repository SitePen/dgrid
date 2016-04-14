/* jshint node:true */

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('intern');

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
		},

		intern: {
			options: {
				reporters: [ 'LcovHtml', 'Pretty' ],
				runType: 'runner',
				config: 'test/intern/intern'
			},

			local: {
				options: {
					config: 'test/intern/intern-local'
				}
			},

			browserstack: {},

			saucelabs: {
				options: {
					config: 'test/intern/intern-saucelabs'
				}
			}
		}
	});

	grunt.registerTask('default', [ 'stylus', 'watch:stylus' ]);
	grunt.registerTask('test', function () {
		var flags = Object.keys(this.flags);

		if (!flags.length) {
			flags.push('local');
		}

		flags.forEach(function (flag) {
			grunt.task.run('intern:' + flag);
		});
	});
};
