'use strict';

// Health monitoring for Impress Application Server

// Init health monitoring
//
impress.health.init = () => {
  if (impress.config.scale.health) {
    impress.health.nodeTimer = api.timers.setInterval(() => {
      const nodeState = impress.health.getNodeState();
      impress.log.node(nodeState.join('\t'));
      impress.cloud.health('node', nodeState);
    }, impress.config.scale.health);
    if (process.isMaster) {
      impress.health.getServerInfo((info) => {
        impress.health.serverInfo = info;
      });
      impress.health.serverTimer = api.timers.setInterval(() => {
        const serverState = impress.health.getServerState();
        impress.log.server(serverState.join('\t'));
        impress.cloud.health('server', serverState);
      }, impress.config.scale.health);
    }
  }
};

// Get server static characteristics
//
impress.health.getServerInfo = (callback) => {
  impress.health.getDrives((drives) => {
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
      cpu: impress.health.cpu(),
      ram: {
        size: api.os.totalmem(),
        free: api.os.freemem()
      },
      net: impress.health.networkInterfaces(),
      drives
    });
  });
};

// Get server dynamic characteristics
//   [systemUptime, freeMemory, workerCount,
//    cpuCount, cpuUser, cpuNice, cpuSys, cpuIdle, cpuIRQ, cpu1, cpu5, cpu15]
//
impress.health.getServerState = () => {
  let cpu = impress.health.cpuTimes(),
      load = api.os.loadavg();
  return [
    Math.round(api.os.uptime()),
    api.os.freemem(),
    impress.workers ? Object.keys(impress.workers).length : 0,
    api.os.cpus().length,
    cpu.user, cpu.nice, cpu.sys, cpu.idle, cpu.irq,
    load[0], load[1], load[2]
  ];
};

// Get node dynamic stats
//   [memoryRSS, heapTotal, heapUsed]
//
impress.health.getNodeState = () => {
  const memoryUsage = process.memoryUsage();
  return [memoryUsage.rss, memoryUsage.heapTotal, memoryUsage.heapUsed];
};

// Get network interfaces except internal
//
impress.health.networkInterfaces = () => {
  let nis = api.os.networkInterfaces(),
      result = [],
      ni, niName, nir;
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

// Get CPU static characteristics
//
impress.health.cpu = () => {
  let cpus = api.os.cpus(),
      result = {};
  if (typeof(cpus) === 'object' && cpus.length > 0) {
    result.model = cpus[0].model;
    result.cores = cpus.length;
    result.speed = cpus[0].speed;
  }
  return result;
};

// Get CPU load dynamic characteristics
//
impress.health.cpuTimes = () => {
  let cpus = api.os.cpus(),
      result = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  if (typeof(cpus) === 'object') {
    for (let i = 0, len = cpus.length; i < len; i++) {
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

// Private function for executing and parsing command line
// for impress.health.getDrives
//
function cmdExec(cmd, callback) {
  let lines, line, header, col, row,
      data = [];
  api.cp.exec(cmd, (err, res) => {
    lines = res.split(rxLine);
    for (let i = 0, ilen = lines.length; i < ilen; i++) {
      line = lines[i];
      if (line) {
        line = line.replace('Use%', 'Use').replace('Mounted on', 'MountedOn');
        col = line.split(process.isWin ? rxCSV : rxSPC);
        if (!header) header = col;
        else {
          row = {};
          for (let j = 0, jlen = col.length; j < jlen; j++) {
            if (header[j] !== 'Node') row[header[j]] = col[j];
          }
          data.push(row);
        }
      }
    }
    callback(data);
  });
}

// Get storage drives for Windows, Unix, Linux and MacOS
//
impress.health.getDrives = (callback) => {
  const result = [];
  if (process.isWin) {
    // Implementation for Windows family systems
    cmdExec(cmdWmic, (data) => {
      let size, free;
      for (let i = 0, len = data.length; i < len; i++) {
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
      callback(result);
    });
  } else {
    // Implementation for Unix, Linux and MacOS family systems
    const results = {};
    api.metasync.sequential([
      (cb) => {
        cmdExec(cmdDfIn, (data) => {
          results.DfIn = data;
          cb(null);
        });
      },
      (cb) => {
        cmdExec(cmdDfSz, (data) => {
          results.DfSz = data;
          cb(null);
        });
      }
    ], () => {
      let rIn, rSz, used, free;
      if (
        results.DfIn &&
        results.DfSz &&
        results.DfIn.length === results.DfSz.length
      ) {
        for (let i = 0, len = results.DfIn.length; i < len; i++) {
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
      callback(result);
    });
  }
};
