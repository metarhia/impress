'use strict';

// Health monitoring for Impress Application Server
//
impress.health = {};

// Init health monitoring
//
impress.health.init = function() {
  if (impress.config.scale.health) {
    impress.health.nodeTimer = setInterval(function() {
      var nodeState = impress.health.getNodeState();
      impress.log.node(nodeState.join('\t'));
      impress.cloud.health('node', nodeState);
    }, impress.config.scale.health);
    if (api.cluster.isMaster) {
      impress.health.getClusterInfo(function(info) {
        impress.health.clusterInfo = info;
      });
      impress.health.clusterTimer = setInterval(function() {
        var clusterState = impress.health.getClusterState();
        impress.log.cluster(clusterState.join('\t'));
        impress.cloud.health('cluster', clusterState);
      }, impress.config.scale.health);
    }
  }
};

// Get cluster (server) static characteristics
//
impress.health.getClusterInfo = function(callback) {
  impress.health.getDrives(function(drives) {
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
      drives: drives
    });
  });
};

// Get cluster (server) dynamic characteristics
//   [systemUptime, freeMemory, workerCount, cpuCount, cpuUser, cpuNice, cpuSys, cpuIdle, cpuIRQ, cpu1, cpu5, cpu15]
//
impress.health.getClusterState = function() {
  var cpu = impress.health.cpuTimes(),
      load = api.os.loadavg();
  return [
    Math.round(api.os.uptime()),
    api.os.freemem(),
    api.cluster.workers ? Object.keys(api.cluster.workers).length : 0,
    api.os.cpus().length,
    cpu.user, cpu.nice, cpu.sys, cpu.idle, cpu.irq,
    load[0], load[1], load[2]
  ];
};

// Get node dynamic stats
//   [memoryRSS, heapTotal, heapUsed]
//
impress.health.getNodeState = function() {
  var memoryUsage = process.memoryUsage();
  return [memoryUsage.rss, memoryUsage.heapTotal, memoryUsage.heapUsed];
};

// Get network interfaces except internal
//
impress.health.networkInterfaces = function() {
  var nis = api.os.networkInterfaces(),
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
impress.health.cpu = function() {
  var cpus = api.os.cpus(),
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
impress.health.cpuTimes = function() {
  var cpus = api.os.cpus(),
      result = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  if (typeof(cpus) === 'object') {
    for (var i = 0, len = cpus.length; i < len; i++) {
      result.user += cpus[i].times.user;
      result.nice += cpus[i].times.nice;
      result.sys  += cpus[i].times.sys;
      result.idle += cpus[i].times.idle;
      result.irq  += cpus[i].times.irq;
    }
  }
  return result;
};

var rxLine = new RegExp('[\r\n]+'),
    rxCSV = ',',
    rxSPC = new RegExp(' +'),
    cmdDfIn = 'df -T -l -i',
    cmdDfSz = 'df -T -l --block-size=1',
    cmdWmic = 'wmic logicaldisk get Caption,Size,FreeSpace,DriveType,FileSystem,VolumeName,VolumeSerialNumber /format:csv';

// Private function for executing and parsing command line for impress.health.getDrives
//
var cmdExec = function(cmd, callback) {
  var lines, line, header, col, row,
      data = [];
  api.exec(cmd, function(err, res) {
    lines = res.split(rxLine);
    for (var i = 0, ilen = lines.length; i < ilen; i++) {
      line = lines[i];
      if (line) {
        line = line.replace('Use%', 'Use').replace('Mounted on', 'MountedOn');
        col = line.split(api.impress.isWin ? rxCSV : rxSPC);
        if (!header) header = col;
        else {
          row = {};
          for (var j = 0, jlen = col.length; j < jlen; j++) {
            if (header[j] !== 'Node') row[header[j]] = col[j];
          }
          data.push(row);
        }
      }
    }
    callback(data);
  });
};

// Get storage drives for Windows, Unix, Linux and MacOS
//
impress.health.getDrives = function(callback) {
  var result = [];
  if (api.impress.isWin) {
    // Implementation for Windows family systems
    cmdExec(cmdWmic, function(data) {
      var size, free;
      for (var i = 0, len = data.length; i < len; i++) {
        size = +data[i].Size;
        free = +data[i].FreeSpace;
        result.push({
          path:  data[i].Caption.toLowerCase(),
          type:  data[i].FileSystem.toLowerCase(),
          size:  size,
          used:  size - free,
          free:  free,
          label: data[i].VolumeName,
          sn:    data[i].VolumeSerialNumber
        });
      }
      callback(result);
    });
  } else {
    // Implementation for Unix, Linux and MacOS family systems
    var results = {};
    api.async.series([
      function(cb) { cmdExec(cmdDfIn, function(data) { results.DfIn = data; cb(null); }); },
      function(cb) { cmdExec(cmdDfSz, function(data) { results.DfSz = data; cb(null); }); }
    ], function() {
      var rIn, rSz, used, free;
      if (results.DfIn && results.DfSz && results.DfIn.length === results.DfSz.length) {
        for (var i = 0, len = results.DfIn.length; i < len; i++) {
          rIn = results.DfIn[i];
          rSz = results.DfSz[i];
          used = +rSz.Used;
          free = +rSz.Available;
          if (rIn.Type !== 'tmpfs') result.push({
            path:   rIn.MountedOn,
            device: rIn.Filesystem,
            type:   rIn.Type,
            size:   used + free,
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
};
