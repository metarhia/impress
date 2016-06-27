module.exports = function(client, callback) {
  callback({
    process: {
      execPath: api.process.execPath,
      execArgv: api.process.execArgv,
      cwd: api.process.cwd(),
      env: api.process.env,
      version: api.process.version,
      versions: api.process.versions,
      config: api.process.config,
      memoryUsage: api.process.memoryUsage(),
      pid: api.process.pid,
      title: api.process.title,
      arch: api.process.arch,
      platform: api.process.platform,
      uptime: api.process.uptime(),
      hrtime: api.process.hrtime()
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
};
