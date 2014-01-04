var fs = require('fs'),
	colors = require('colors'),
	path = require('path'),
	ncp = require('ncp').ncp,
	sys = require('sys'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	open = require("open");

var isWin = !!process.platform.match(/^win/);

ncp.limit = 16;

var current = path.dirname(__filename.replace(/\\/g, '/')),
	destination = path.dirname(path.dirname(current))+'/',
	source = current+'/examples/copyContentToProjectFolder/';

fs.exists(destination+'setup.js', function(exists) {
	if (!exists) {
		fs.exists(destination+'server.js', function(exists) {
			if (!exists) {
				fs.exists(destination+'config', function(exists) {
					if (!exists) {
						fs.exists(destination+'applications', function(exists) {
							if (!exists) {
								console.log('Install Impress Application Server...'.bold.green);
								fs.createReadStream(source+'server.js').pipe(fs.createWriteStream(destination+'server.js'));
								fs.createReadStream(source+'setup.js').pipe(fs.createWriteStream(destination+'setup.js'));
								ncp(source+'config', destination+'config', { clobber: false }, function (err) {
									if (err) console.error(err);
									ncp(source+'applications', destination+'applications', { clobber: false }, function (err) {
										if (err) console.error(err);
										if (isWin) {
											exec('start cmd /K "cd /d '+destination.replace(/\//g, '\\')+' & node server.js"' );
										} else {
											var n = spawn('node', [destination+'server.js'], { cwd: destination });
											n.stdout.on('data', function (data) {
												console.log(data.toString().replace(/[\r\n]/g,''));
											});
											n.stderr.on('data', function (data) {
												console.log(data.toString().replace(/[\r\n]/g,''));
											});
										}
										setTimeout(function() {
											open('http://127.0.0.1', function() {
												if (isWin) setTimeout(function() { process.exit(0); });
											});
										}, 2000);
									});
								});
							}
						});
					}
				});
			}
		});
	}
});