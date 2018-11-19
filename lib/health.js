'use strict';

// Health monitoring for Impress Application Server

const health = {};
api.health = health;

// Init health monitoring
health.init = () => {
  if (impress.config.sections.scale.health) {
    health.nodeTimer = api.timers.setInterval(() => {
      const nodeState = health.getNodeState();
      impress.log.system(nodeState.join('\t'));
      api.cloud.health('node', nodeState);
    }, impress.config.sections.scale.health);
    if (impress.isMaster) {
      health.getServerInfo(info => {
        health.serverInfo = info;
      });
      health.serverTimer = api.timers.setInterval(() => {
        const serverState = health.getServerState();
        impress.log.system(serverState.join('\t'));
        api.cloud.health('server', serverState);
      }, impress.config.sections.scale.health);
    }
  }
};

// Get server static characteristics
//   callback <Function>({ os, nodejs, cpu, ram, net, drives })
health.getServerInfo = callback => {
  health.getDrives((err, drives) => {
    if (err) drives = 'Cannot list drives';
    callback({
      os: {
        host:       api.os.hostname(),
        type:       api.os.type(),
        platform:   api.os.platform(),
        arch:       api.os.arch(),
        release:    api.os.release(),
        endianness: api.os.endianness()
      },
      nodejs: {
        version:  process.version.replace('v', ''),
        versions: process.versions,
        pid:      process.pid,
        arch:     process.arch
      },
      cpu: health.cpu(),
      ram: {
        size: api.os.totalmem(),
        free: api.os.freemem()
      },
      net: health.networkInterfaces(),
      drives
    });
  });
};

// Get server dynamic characteristics: [systemUptime, freeMemory, workerCount,
// cpuCount, cpuUser, cpuNice, cpuSys, cpuIdle, cpuIRQ, cpu1, cpu5, cpu15]
health.getServerState = () => {
  const cpu = health.cpuTimes();
  const load = api.os.loadavg();
  return [
    Math.round(api.os.uptime()),
    api.os.freemem(),
    impress.workers ? Object.keys(impress.workers).length : 0,
    api.os.cpus().length,
    cpu.user, cpu.nice, cpu.sys, cpu.idle, cpu.irq,
    load[0], load[1], load[2]
  ];
};

// Get node dynamic stats: [memoryRSS, heapTotal, heapUsed]
health.getNodeState = () => {
  const memoryUsage = process.memoryUsage();
  return [memoryUsage.rss, memoryUsage.heapTotal, memoryUsage.heapUsed];
};

// Get network interfaces except internal
health.networkInterfaces = () => {
  const nis = api.os.networkInterfaces();
  const result = [];
  if (typeof nis === 'object') {
    for (const niName in nis) {
      const ni = nis[niName];
      if (!ni[0].internal) {
        const nir = { name: niName };
        if (ni[0]) nir.ipv4 = ni[0].address;
        if (ni[1]) nir.ipv6 = ni[1].address;
        result.push(nir);
      }
    }
  }
  return result;
};

// Get CPU static characteristics
health.cpu = () => {
  const cpus = api.os.cpus();
  if (typeof cpus !== 'object' || cpus.length === 0) return {};
  return {
    model: cpus[0].model,
    cores: cpus.length,
    speed: cpus[0].speed
  };
};

// Get CPU load dynamic characteristics
health.cpuTimes = () => {
  const cpus = api.os.cpus();
  const result = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  if (typeof cpus === 'object') {
    for (let i = 0; i < cpus.length; i++) {
      result.user += cpus[i].times.user;
      result.nice += cpus[i].times.nice;
      result.sys  += cpus[i].times.sys;
      result.idle += cpus[i].times.idle;
      result.irq  += cpus[i].times.irq;
    }
  }
  return result;
};

const rxLine = new RegExp('[\\r\\n]+');
const rxCSV = ',';
const rxSPC = new RegExp(' +');
const cmdDfIn = 'df -T -l -i';
const cmdDfSz = 'df -T -l --block-size=1';
const hdr = [
  'Caption', 'Size', 'FreeSpace', 'DriveType', 'FileSystem',
  'VolumeName', 'VolumeSerialNumber'
].join(',');
const cmdWmic = 'wmic logicaldisk get ' + hdr + ' /format:csv';

// Executing and parsing command line for health.getDrives
//   cmd <string> command
//   callback <Function>(err, data)
const cmdExec = (cmd, callback) => {
  const data = [];
  api.cp.exec(cmd, (err, res) => {
    if (err) {
      callback(err);
      return;
    }
    const lines = res.split(rxLine);
    let header;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line) {
        line = line.replace('Use%', 'Use').replace('Mounted on', 'MountedOn');
        const col = line.split(impress.isWin ? rxCSV : rxSPC);
        if (!header) {
          header = col;
        } else {
          const row = {};
          for (let j = 0; j < col.length; j++) {
            if (header[j] !== 'Node') row[header[j]] = col[j];
          }
          data.push(row);
        }
      }
    }
    callback(null, data);
  });
};

// Get storage drives for Windows, Unix, Linux and MacOS
//   callback <Function>(err, data)
health.getDrives = callback => {
  const result = [];
  if (impress.isWin) {
    // Implementation for Windows family systems
    cmdExec(cmdWmic, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      for (let i = 0; i < data.length; i++) {
        const size = +data[i].Size;
        const free = +data[i].FreeSpace;
        result.push({
          path: data[i].Caption.toLowerCase(),
          type: data[i].FileSystem.toLowerCase(),
          size,
          used: size - free,
          free,
          label: data[i].VolumeName,
          sn: data[i].VolumeSerialNumber
        });
      }
      callback(null, result);
    });
  } else {
    // Implementation for Unix, Linux and MacOS family systems
    const results = {};
    api.metasync.sequential([
      cb => {
        cmdExec(cmdDfIn, (err, data) => {
          if (err) {
            cb(err);
            return;
          }
          results.DfIn = data;
          cb(null);
        });
      },
      cb => {
        cmdExec(cmdDfSz, (err, data) => {
          if (err) {
            cb(err);
            return;
          }
          results.DfSz = data;
          cb(null);
        });
      }
    ], () => {
      if (
        results.DfIn &&
        results.DfSz &&
        results.DfIn.length === results.DfSz.length
      ) {
        for (let i = 0; i < results.DfIn.length; i++) {
          const rIn = results.DfIn[i];
          const rSz = results.DfSz[i];
          const used = +rSz.Used;
          const free = +rSz.Available;
          if (rIn.Type !== 'tmpfs') {
            result.push({
              path: rIn.MountedOn,
              device: rIn.Filesystem,
              type: rIn.Type,
              size: used + free,
              used,
              free,
              inodes: +rIn.Inodes,
              iused: +rIn.IUsed,
              ifree: +rIn.IFree,
            });
          }
        }
      }
      callback(null, result);
    });
  }
};
