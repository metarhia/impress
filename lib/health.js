'use strict';

// Health monitoring for Impress Application Server

const health = {};
api.health = health;

// Init health monitoring
health.init = () => {
  const DEFAULT_INTERVAL = api.common.duration('30s');
  const config = impress.config.sections.scale;
  const interval = config.health || DEFAULT_INTERVAL;
  health.cpuCount = api.os.cpus().length;
  if (interval > 0) {
    health.nodeTimer = setInterval(() => {
      const nodeState = health.getNodeState();
      impress.log.system(nodeState.join(','));
      api.cloud.health('node', nodeState);
    }, interval);
    if (impress.isMaster) {
      health.getServerInfo(info => {
        health.serverInfo = info;
      });
      health.serverTimer = setInterval(() => {
        const serverState = health.getServerState();
        impress.log.system(serverState.join(','));
        api.cloud.health('server', serverState);
      }, interval);
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
    impress.workers.size,
    health.cpuCount,
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
const rxSPC = new RegExp('\\s+');
const dfFields = [
  'target', 'source', 'fstype', 'used', 'avail', 'itotal', 'iused', 'iavail',
];
const cmdDf = `df --exclude-type=tmpfs -l --block-size=1 --output=${dfFields}`;
const hdr = [
  'Caption', 'Size', 'FreeSpace', 'FileSystem',
  'VolumeName', 'VolumeSerialNumber'
].sort();
const cmdWmic = `wmic logicaldisk get ${hdr} /format:csv`;

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
    res = res.trim();
    res = res.slice(res.search(rxLine)).trim();
    const lines = res.split(rxLine);
    const header = impress.isWin ? hdr : dfFields;
    for (const line of lines) {
      if (line) {
        const col = line.split(impress.isWin ? rxCSV : rxSPC);
        if (impress.isWin) col.shift();
        const row = {};
        for (let j = 0; j < col.length; j++) {
          row[header[j]] = col[j];
        }
        data.push(row);
      }
    }
    callback(null, data);
  });
};

const getSmartStatusOfDrive = (driveName, callback) => {
  const cmd = `smartctl -H /dev/${driveName}`;
  api.cp.exec(cmd, (error, stdout, stderr) => {
    if (error) {
      impress.log.error(stderr);
      callback(error);
      return;
    }

    const status = stdout.toString().split(':').pop().trim();
    callback(null, status === 'PASSED');
  });
};


health.getSmartStatus = callback => {
  const cmd = 'lsblk -d -J';
  const drivesStatus = {};
  api.cp.exec(cmd, (error, stdout, stderr) => {
    if (error) {
      impress.log.error(stderr);
      callback(error);
      return;
    }

    const funcs = JSON.parse(stdout).blockdevices.map(drive =>
      next => getSmartStatusOfDrive(drive.name, (error, status) => {
        if (error) {
          next(error);
          return;
        }
        drivesStatus[drive.name] = status;
        next(null);
      })
    );

    api.metasync.sequential(funcs, error => {
      if (error) callback(error);
      else callback(null, drivesStatus);
    });
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
    cmdExec(cmdDf, (err, data) => {
      if (err) {
        callback(err);
        return;
      }
      for (const drive of data) {
        const used = +drive.used;
        const free = +drive.avail;
        result.push({
          path: drive.target,
          device: drive.source,
          type: drive.fstype,
          size: used + free,
          used,
          free,
          inodes: +drive.itotal,
          iused: +drive.iused,
          ifree: +drive.iavail,
        });
      }
      callback(null, result);
    });
  }
};
