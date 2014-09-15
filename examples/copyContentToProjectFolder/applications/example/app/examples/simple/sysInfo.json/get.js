module.exports = function(client, callback) {

  callback({
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
      tmpdir: api.os.tmpdir(),
      endianness: api.os.endianness(),
      hostname: api.os.hostname(),
      type: api.os.type(),
      platform: api.os.platform(),
      arch: api.os.arch(),
      release: api.os.release(),
      uptime: api.os.uptime(),
      loadavg: api.os.loadavg(),
      totalmem: api.os.totalmem(),
      freemem: api.os.freemem(),
      cpus: api.os.cpus(),
      networkInterfaces: api.os.networkInterfaces()
    }
  });

}