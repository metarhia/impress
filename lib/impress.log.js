(function(impress) {

	impress.log = {};

	// Default log files set
	impress.log.fileTypes = [ "access", "error", "debug", "slow" ];

	impress.log.files = {}; // item = { fd, buf, timer, lock }

	var dayMilliseconds = duration("1d");

	var defaultWriteInterval = "5s";
	var defaultWriteBuffer = 64 * 1024;

	impress.log.writeInterval = duration(
		(impress.config.log && impress.config.log.writeInterval)
		? impress.config.log.writeInterval : defaultWriteInterval
	);

	var makeTimer = function(fileType) {
		return function() {
			impress.log.flush(fileType);
		}
	};

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
					impress.log.files[fileType] = {
						fd: impress.fs.createWriteStream(fileName, {
							flags: 'a',
							highWaterMark: impress.config.log.writeBuffer || defaultWriteBuffer
						}),
						buf: "",
						lock: false,
						timer: setInterval(makeTimer(fileType), impress.log.writeInterval)
					};
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
		var file = impress.log.files[fileType];
		if (file) {
			var filePath = file.fd.path;
			impress.log.flush(fileType, function() {
				file.fd.end();
				clearInterval(file.timer);
				delete impress.log.files[fileType];
				if (impress.cluster.isMaster) {
					impress.fs.stat(filePath, function(err, stats) {
						if (stats && (stats.size==0)) impress.fs.unlink(filePath, function (err) {});
					});
				}
			});
		}
	}

	// Close log files
	//
	impress.log.close = function() {
		for (var fileType in impress.log.files) impress.log.closeFile(fileType);
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
	impress.log.write = function(fileType, message) {
		var file = impress.log.files[fileType];
		if (file) file.buf += (new Date()).toISOString()+'\t'+message+'\n';
	}

	impress.log.flush = function(fileType, callback) {
		var file = impress.log.files[fileType];
		if (file && !file.lock && file.buf.length>0) {
			file.lock = true;
			var buf = file.buf;
			file.buf = "";
			file.fd.write(buf, function() {
				file.lock = false;
				if (callback) callback();
			});
		} else if (callback) callback();
	}

	// Write access to log
	//
	impress.log.access = function(message) {
		impress.log.write('access', message);
	}

	// Write error to log
	//
	impress.log.error = function(message) {
		impress.log.write('error', message);
	}

	// Write error to log
	//
	impress.log.debug = function(message) {
		impress.log.write('debug', message);
	}

	// Write slow log
	//
	impress.log.slow = function(message) {
		impress.log.write('slow', message);
	}

} (global.impress = global.impress || {}));