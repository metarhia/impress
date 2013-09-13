(function(impress) {

	impress.log = {};

	// Default log files set
	impress.log.fileTypes = [ "access", "error", "debug", "slow" ];

	impress.log.fileDescriptors = {};

	var dayMilliseconds = 86400000;

	// Open log files
	//
	impress.log.open = function(sid) {
		impress.mkdirp(impress.dir+'/log', function(err) {
			if (err) console.error(err);
			else {
				var now = new Date(),
					yyyy = now.getUTCFullYear(),
					mm = (now.getUTCMonth()+1).toString(),
					dd = now.getDate().toString(),
					date = yyyy+'-'+(mm[1]?mm:"0"+mm[0])+'-'+(dd[1]?dd:"0"+dd[0]);
				for (var i in impress.log.fileTypes) {
					var fileType = impress.log.fileTypes[i],
						fileName = impress.dir+'/log/'+date+'-'+fileType+'.log';
					impress.log.closeFile(fileType);
					impress.log.fileDescriptors[fileType] = impress.fs.createWriteStream(fileName, {flags: 'a'});
				}
				var nextReopen = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - now + dayMilliseconds*2;
				setTimeout(impress.log.open, nextReopen);
				if (impress.config.log.keepDays && impress.cluster.isMaster) impress.log.deleteOldFiles();
			}
		});
	};

	// Close log file of specified type
	//
	impress.log.closeFile = function(fileType) {
		if (impress.log.fileDescriptors[fileType]) {
			var filePath = impress.log.fileDescriptors[fileType].path;
			impress.log.fileDescriptors[fileType].end();
			delete impress.log.fileDescriptors[fileType];
			if (impress.cluster.isMaster) {
				impress.fs.stat(filePath, function(err, stats) {
					if (stats.size==0) impress.fs.unlink(filePath, function (err) {});
				});
			}
		}
	}

	// Close log files
	//
	impress.log.close = function() {
		for (var fileType in impress.log.fileDescriptors) impress.log.closeFile(fileType);
	}

	// Delete old log files
	//
	impress.log.deleteOldFiles = function() {
		impress.fs.readdir(impress.dir+'/log', function(err, files) {
			if (!err) {
				var now = new Date(),
					now = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
				for (var i in files) {
					var fileDate = new Date(files[i].substring(0, 10)),
						fileAge = Math.floor((now.getTime()-fileDate.getTime()) / dayMilliseconds);
					if (fileAge>1 && fileAge>impress.config.log.keepDays) impress.fs.unlink(impress.dir+'/log/'+files[i], function(err) {});
				}
			}
		});
	}

	// Write message to log
	//
	impress.log.write = function(fd, message) {
		if (fd) fd.write((new Date()).toISOString()+'\t'+message+'\n');
	}

	// Write access to log
	//
	impress.log.access = function(message) {
		impress.log.write(impress.log.fileDescriptors['access'], message);
	}

	// Write error to log
	//
	impress.log.error = function(message) {
		impress.log.write(impress.log.fileDescriptors['error'], message);
	}

	// Write error to log
	//
	impress.log.debug = function(message) {
		impress.log.write(impress.log.fileDescriptors['debug'], message);
	}

	// Write error to log
	//
	impress.log.slow = function(message) {
		impress.log.write(impress.log.fileDescriptors['slow'], message);
	}

} (global.impress = global.impress || {}));