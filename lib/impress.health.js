(function(impress) {

	impress.health = {};

	var defaultMonitoringInterval = 5*1000;

	impress.health.monitoringInterval = (impress.config.health && impress.config.health.monitoringInterval)
		? impress.config.health.monitoringInterval : defaultMonitoringInterval;

	impress.health.isWin = !!process.platform.match(/^win/);

	// Init health monitoring
	//
	impress.health.init = function() {
		if (impress.cluster.isMaster) {
			impress.health.history = {};
			for (var i = 0; i < impress.workers.length; i++) {
				impress.workers[i].on('message', function(msg) {
					console.dir({healthWorkerOnMessage:msg, isMaster: impress.cluster.isMaster});
					if (msg.name == 'impress:health') {
						//console.dir(msg);
					}
				});
			}
			impress.health.timer = setInterval(function() {
				//
			}, impress.health.monitoringInterval);
		} else {
			impress.health.timer = setInterval(function() {
				process.send({
					name: 'impress:health',
					data: impress.health.getNodeState()
				});
			}, impress.health.monitoringInterval);
		}
	}

	// Get server static characteristics
	//
	impress.health.getServerInfo = function(callback) {
		impress.health.getDrives(function(drives) {
			callback({
				os: {
				    host:       impress.os.hostname(),
					type:       impress.os.type(),
					platform:   impress.os.platform(),
					arch:       impress.os.arch(),
					release:    impress.os.release(),
					endianness: impress.os.endianness()
				},
				nodejs: {
					version:  process.version.replace('v', ''),
					versions: process.versions,
					pid:      process.pid,
					arch:     process.arch
				},
				cpu: impress.health.cpu(),
				ram: {
					size: impress.os.totalmem()
				},
				net: impress.health.networkInterfaces(),
				drives: drives
			});
		});
	}

	// Get server dynamic characteristics
	//
	impress.health.getServerState = function() {
		return {
			cluster: {
			},
			systemUptime: impress.os.uptime(),
			ramFree: impress.os.freemem(),
			cpuTimes: impress.health.cpuTimes(),
			loadavg: impress.os.loadavg()
		};
	}

	// Get node process dynamic characteristics
	//
	impress.health.getNodeState = function() {
		var memoryUsage = process.memoryUsage();
		return {
			nodeUptime: process.uptime(),
			ram: {
				rss:       memoryUsage.rss,
				heapTotal: memoryUsage.heapTotal,
				heapUsed:  memoryUsage.heapUsed
			},
			cpu: impress.health.cpuTimes()
		};
	}

	impress.health.addHistory = function() {

	}

	impress.health.startMonitoring = function() {

	}

	impress.health.stopMonitoring = function() {

	}

	// Get network interfaces except internal
	//
	impress.health.networkInterfaces = function() {
		var nis = impress.os.networkInterfaces(),
			result = [];
		if (typeof(nis) == "object") {
			for (var niName in nis) {
				var ni = nis[niName];
				if (!ni[0].internal) result.push({
					name: niName,
					ipv4: ni[0].address,
					ipv6: ni[1].address
				});
			}
		}
		return result;
	}

	// Get CPU static characteristics
	impress.health.cpu = function() {
		var cpus = impress.os.cpus(),
			result = {};
		if (typeof(cpus) == "object" && cpus.length>0) {
			result.model = cpus[0].model;
			result.cores = cpus.length;
			result.speed = cpus[0].speed;
		}
		return result;
	}

	// Get CPU load dynamic characteristics
	impress.health.cpuTimes = function() {
		var cpus = impress.os.cpus(),
			result = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
		if (typeof(cpus) == "object") {
			for (var i = 0; i < cpus.length; i++) {
				result.user = cpus[i].times.user;
				result.nice = cpus[i].times.nice;
				result.sys  = cpus[i].times.sys;
				result.idle = cpus[i].times.idle;
				result.irq  = cpus[i].times.irq;
			}
		}
		return result;
	}

	// Private function for executing and parsing command line for impress.health.getDrives
	var cmdExec = function(cmd, callback) {
		var lines, line, header, col, row,
			data = [];
		impress.exec(cmd, function(err, res) {
			lines = res.split(rxLine);
			for (var i = 0; i < lines.length; i++) {
				line = lines[i];
				if (line) {
					line = line.replace("Use%", "Use").replace("Mounted on", "MountedOn");
					col = line.split(impress.health.isWin ? rxCSV : rxSPC);
					if (!header) {
						header = col;
					} else {
						row = {};
						for (var j = 0; j < col.length; j++) {
							if (header[j] != 'Node') row[header[j]] = col[j];
						}
						data.push(row);
					}
				}
			}
			callback(data);
		});
	};

	var rxLine = new RegExp("[\r\n]+"),
		rxCSV = ",",
		rxSPC = new RegExp(" +"),
		cmdDfIn = 'df -T -l -i',
		cmdDfSz = 'df -T -l --block-size=1',
		cmdWmic = 'wmic logicaldisk get Caption,Size,FreeSpace,DriveType,FileSystem,VolumeName,VolumeSerialNumber /format:csv';

	impress.health.getDrives = function(callback) {
		var result = [];
		if (impress.health.isWin) {
			// Implementation for Windows family systems
			cmdExec(cmdWmic, function(data) {
				for (var i = 0; i < data.length; i++) {
					var size = +data[i].Size, free = +data[i].FreeSpace;
					result.push({
						path:   data[i].Caption.toLowerCase(),
						type:   data[i].FileSystem.toLowerCase(),
						size:   size,
						used:   size-free,
						free:   free,
						label:  data[i].VolumeName,
						sn:     data[i].VolumeSerialNumber
					});
				}
				callback(result);
			});
		} else {
			// Implementation for Unix, Linux and MacOS family systems
			var results = {};
			async.series([
				function(cb) { cmdExec(cmdDfIn, function(data) { results.DfIn = data; cb(null); }); },
				function(cb) { cmdExec(cmdDfSz, function(data) { results.DfSz = data; cb(null); }); },
			], function() {
				if (results.DfIn && results.DfSz && results.DfIn.length == results.DfSz.length) {
					for (var i = 0; i < results.DfIn.length; i++) {
						var rIn = results.DfIn[i], rSz = results.DfSz[i],
							used = +rSz.Used, free = +rSz.Available;
						if (rIn.Type != 'tmpfs') result.push({
							path:   rIn.MountedOn,
							device: rIn.Filesystem,
							type:   rIn.Type,
							size:   used+free,
							used:   used,
							free:   free,
							inodes: +rIn.Inodes,
							iused:  +rIn.IUsed,
							ifree:  +rIn.IFree
						});
					}
				}
				callback(result);
			});
		}
	}

} (global.impress = global.impress || {}));