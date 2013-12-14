module.exports = function(req, res, callback) {

	var os = impress.os;

	res.context.data = {
		process: {
			execPath: process.execPath,
			execArgv: process.execArgv,
			cwd: process.cwd(),
			env: process.env,
			version: process.version,
			versions: process.versions,
			config: process.config,
			memoryUsage: process.memoryUsage(),
			pid: process.pid,
			title: process.title,
			arch: process.arch,
			platform: process.platform,
			uptime: process.uptime(),
			hrtime: process.hrtime()
		},
		os: {
			tmpdir: os.tmpdir(),
			endianness: os.endianness(),
			hostname: os.hostname(),
			type: os.type(),
			platform: os.platform(),
			arch: os.arch(),
			release: os.release(),
			uptime: os.uptime(),
			loadavg: os.loadavg(),
			totalmem: os.totalmem(),
			freemem: os.freemem(),
			cpus: os.cpus(),
			networkInterfaces: os.networkInterfaces()
		}
	};
	callback();

}