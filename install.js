var fs = require('fs'),
	colors = require('colors'),
	path = require('path'),
	ncp = require('ncp').ncp;

ncp.limit = 16;

var current = path.dirname(__filename.replace(/\\/g, '/')),
	destination = path.dirname(path.dirname(current))+'/',
	source = current+'/examples/copyContentToProjectFolder/';

fs.exists(destination+'config.js', function(exists) {
	if (!exists) {
		fs.exists(path+'server.js', function(exists) {
			if (!exists) {
				fs.exists(path+'setup.js', function(exists) {
					if (!exists) {
						fs.exists(path+'sites', function(exists) {
							if (!exists) {
								console.log('Install Impress Application Server...'.bold.green);
								fs.createReadStream(source+'config.js').pipe(fs.createWriteStream(destination+'config.js'));
								fs.createReadStream(source+'server.js').pipe(fs.createWriteStream(destination+'server.js'));
								fs.createReadStream(source+'setup.js').pipe(fs.createWriteStream(destination+'setup.js'));
								ncp(source, destination, { clobber: false }, function (err) {
									if (err) {
										return console.error(err);
									}
									console.log('done!');
								});
							}
						});
					}
				});
			}
		});
	}
});