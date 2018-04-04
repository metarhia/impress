'use strict';

// Health monitoring for Impress Application Server

const health = {};
impress.health = health;

health.init = (
  // Init health monitoring
) => {
  if (impress.config.scale.health) {
    health.nodeTimer = api.timers.setInterval(() => {
      const nodeState = health.getNodeState();
      impress.log.system(nodeState.join('\t'));
      impress.cloud.health('node', nodeState);
    }, impress.config.scale.health);
    if (process.isMaster) {
      health.getServerInfo((info) => {
        health.serverInfo = info;
      });
      health.serverTimer = api.timers.setInterval(() => {
        const serverState = health.getServerState();
        impress.log.system(serverState.join('\t'));
        impress.cloud.health('server', serverState);
      }, impress.config.scale.health);
    }
  }
};

health.getServerInfo = (
  // Get server static characteristics
  callback // function({ os, nodejs, cpu, ram, net, drives })
) => {
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

health.getServerState = (
  // Get server dynamic characteristics: [systemUptime, freeMemory, workerCount,
  // cpuCount, cpuUser, cpuNice, cpuSys, cpuIdle, cpuIRQ, cpu1, cpu5, cpu15]
) => {
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

health.getNodeState = (
  // Get node dynamic stats: [memoryRSS, heapTotal, heapUsed]
) => {
  const memoryUsage = process.memoryUsage();
  return [memoryUsage.rss, memoryUsage.heapTotal, memoryUsage.heapUsed];
};

health.networkInterfaces = (
  // Get network interfaces except internal
) => {
  const nis = api.os.networkInterfaces();
  const result = [];
  let ni, niName, nir;
  if (typeof(nis) === 'object') {
    for (niName in nis) {
      ni = nis[niName];
      if (!ni[0].internal) {
        nir = { name: niName };
        if (ni[0]) nir.ipv4 = ni[0].address;
        if (ni[1]) nir.ipv6 = ni[1].address;
        result.push(nir);
      }
    }
  }
  return result;
};

health.cpu = (
  // Get CPU static characteristics
) => {
  const cpus = api.os.cpus();
  if (typeof(cpus) !== 'object' || cpus.length === 0) return {};
  return {
    model: cpus[0].model,
    cores: cpus.length,
    speed: cpus[0].speed
  };
};

health.cpuTimes = (
  // Get CPU load dynamic characteristics
) => {
  const cpus = api.os.cpus();
  const result = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  if (typeof(cpus) === 'object') {
    let i, len;
    for (i = 0, len = cpus.length; i < len; i++) {
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

const cmdExec = (
  // Executing and parsing command line for health.getDrives
  cmd, // command string
  callback // function(err, data)
) => {
  const data = [];
  api.cp.exec(cmd, (err, res) => {
    if (err) {
      callback(err);
      return;
    }
    const lines = res.split(rxLine);
    let i, ilen, j, jlen, line, header, col, row;
    for (i = 0, ilen = lines.length; i < ilen; i++) {
      line = lines[i];
      if (line) {
        line = line.replace('Use%', 'Use').replace('Mounted on', 'MountedOn');
        col = line.split(process.isWin ? rxCSV : rxSPC);
        if (!header) header = col;
        else {
          row = {};
          for (j = 0, jlen = col.length; j < jlen; j++) {
            if (header[j] !== 'Node') row[header[j]] = col[j];
          }
          data.push(row);
        }
      }
    }
    callback(null, data);
  });
};

health.getDrives = (
  // Get storage drives for Windows, Unix, Linux and MacOS
  callback // function(err, data)
) => {
  const result = [];
  if (process.isWin) {
    // Implementation for Windows family systems
    cmdExec(cmdWmic, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      let i, len, size, free;
      for (i = 0, len = data.length; i < len; i++) {
        size = +data[i].Size;
        free = +data[i].FreeSpace;
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
      (cb) => {
        cmdExec(cmdDfIn, (err, data) => {
          if (err) {
            cb(err);
            return;
          }
          results.DfIn = data;
          cb(null);
        });
      },
      (cb) => {
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
        let i, len, rIn, rSz, used, free;
        for (i = 0, len = results.DfIn.length; i < len; i++) {
          rIn = results.DfIn[i];
          rSz = results.DfSz[i];
          used = +rSz.Used;
          free = +rSz.Available;
          if (rIn.Type !== 'tmpfs') result.push({
            path: rIn.MountedOn,
            device: rIn.Filesystem,
            type: rIn.Type,
            size: used + free,
            used,
            free,
            inodes: +rIn.Inodes,
            iused: +rIn.IUsed,
            ifree: +rIn.IFree
          });
        }
      }
      callback(null, result);
    });
  }
};
