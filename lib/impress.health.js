"use strict";

impress.health = {};

var defaultMonitoringInterval = '5s';

impress.health.monitoringInterval = duration(
  (impress.config.cloud && impress.config.cloud.health) ? impress.config.cloud.helth : defaultMonitoringInterval
);

var historyCluster, historyNodes, statCluster, statNodes;

function clearDataStructures() {
  historyCluster = [];
  historyNodes = {};
  statCluster = {};
  statNodes = {};
  var nodeId;
  for (var workerId in api.cluster.workers) {
    nodeId = impress.workers[i].nodeId;
    historyNodes[nodeId] = [];
    statNodes[nodeId] = [];
  }
}

// Init health monitoring
//
impress.health.init = function() {
  if (api.cluster.isMaster) {
    clearDataStructures();
    if (impress.config.cluster.strategy === 'single') {
      impress.health.timer = setInterval(function() {
        historyNodes[impress.nodeId].push(impress.health.getNodeState());
        historyCluster.push(impress.health.getClusterState());
      }, impress.health.monitoringInterval);
    } else {
      for (var i in impress.workers) {
        impress.workers[i].on('message', function(msg) {
          if (msg.name === 'impress:health') historyNodes[msg.nodeId].push(msg.data);
        });
      }
      impress.health.timer = setInterval(function() {
        historyCluster.push(impress.health.getClusterState());
      }, impress.health.monitoringInterval);
    }
  } else {
    impress.health.timer = setInterval(function() {
      process.send({
        name:   'impress:health',
        nodeId: impress.nodeId,
        data:   impress.health.getNodeState()
      });
    }, impress.health.monitoringInterval);
  }
};

// Get cluster (server) static characteristics
//
impress.health.getClusterInfo = function(callback) {
  impress.health.getDrives(function(drives) {
    callback({
      time: (new Date()).getTime(),
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
        size: api.os.totalmem()
      },
      net: impress.health.networkInterfaces(),
      drives: drives
    });
  });
};

// Get cluster (server) dynamic characteristics
//
impress.health.getClusterState = function() {
  var cpu = impress.health.cpuTimes(),
      load = api.os.loadavg();
  return {
    time:    (new Date()).getTime(),
    uptime:  Math.round(api.os.uptime()),
    freemem: api.os.freemem(),
    tuser:   cpu.user,
    tnice:   cpu.nice,
    tsys:    cpu.sys,
    tidle:   cpu.idle,
    tirq:    cpu.irq,
    load1:   load[0],
    load5:   load[1],
    load15:  load[2],
    forks:   Object.keys(api.cluster.workers).length,
    sse:     impress.stat.eventCount
  };
};

// Get node process dynamic characteristics
//
impress.health.getNodeState = function() {
  var memoryUsage = process.memoryUsage();
  return {
    time:   (new Date()).getTime(),
    uptime: Math.round(process.uptime()),
    rss:    memoryUsage.rss,
    heap:   memoryUsage.heapTotal,
    used:   memoryUsage.heapUsed,
    req:    impress.stat.requestCount,
    res:    impress.stat.responseCount
  };
};

impress.health.saveHistoryCluster = function(fileName) {
  var fd = api.fs.createWriteStream(fileName, { flags: 'a' });
  // node;time;uptime;rss;heap;used;req;res
  var data, line;
  for (var i = 0; i < historyCluster.length; i++) {
    data = historyCluster[i];
    line = [];
    for (var fieldName in data) line.push(data[fieldName]);
    fd.write(line.join(';')+'\n');
  }
  fd.end();
  clearDataStructures();
};

impress.health.saveHistoryNodes = function(fileName) {
  var fd = api.fs.createWriteStream(fileName, { flags: 'a' });
  // node;time;uptime;rss;heap;used;req;res
  var node, data, line;
  for (var nodeId in historyNodes) {
    node = historyNodes[nodeId];
    for (var i = 0; i < node.length; i++) {
      data = node[i];
      line = [];
      line.push(nodeId);
      for (var fieldName in data) line.push(data[fieldName]);
      fd.write(line.join(';')+'\n');
    }
  }
  fd.end();
  clearDataStructures();
};

// Get network interfaces except internal
//
impress.health.networkInterfaces = function() {
  var nis = api.os.networkInterfaces(),
      result = [];
  if (typeof(nis) === 'object') {
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
};

// Get CPU static characteristics
//
impress.health.cpu = function() {
  var cpus = api.os.cpus(),
      result = {};
  if (typeof(cpus) === 'object' && cpus.length>0) {
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
    for (var i = 0; i < cpus.length; i++) {
      result.user = cpus[i].times.user;
      result.nice = cpus[i].times.nice;
      result.sys  = cpus[i].times.sys;
      result.idle = cpus[i].times.idle;
      result.irq  = cpus[i].times.irq;
    }
  }
  return result;
};

// Private function for executing and parsing command line for impress.health.getDrives
//
var cmdExec = function(cmd, callback) {
  var lines, line, header, col, row,
      data = [];
  api.exec(cmd, function(err, res) {
    lines = res.split(rxLine);
    for (var i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line) {
        line = line.replace('Use%', 'Use').replace('Mounted on', 'MountedOn');
        col = line.split(impress.isWin ? rxCSV : rxSPC);
        if (!header) header = col;
        else {
          row = {};
          for (var j = 0; j < col.length; j++) {
            if (header[j] !== 'Node') row[header[j]] = col[j];
          }
          data.push(row);
        }
      }
    }
    callback(data);
  });
};

var rxLine = new RegExp('[\r\n]+'),
    rxCSV = ',',
    rxSPC = new RegExp(' +'),
    cmdDfIn = 'df -T -l -i',
    cmdDfSz = 'df -T -l --block-size=1',
    cmdWmic = 'wmic logicaldisk get Caption,Size,FreeSpace,DriveType,FileSystem,VolumeName,VolumeSerialNumber /format:csv';

// Get storage drives for Windows, Unix, Linux and MacOS
//
impress.health.getDrives = function(callback) {
  var result = [];
  if (impress.isWin) {
    // Implementation for Windows family systems
    cmdExec(cmdWmic, function(data) {
      for (var i = 0; i < data.length; i++) {
        var size = +data[i].Size, free = +data[i].FreeSpace;
        result.push({
          path:  data[i].Caption.toLowerCase(),
          type:  data[i].FileSystem.toLowerCase(),
          size:  size,
          used:  size-free,
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
      if (results.DfIn && results.DfSz && results.DfIn.length === results.DfSz.length) {
        for (var i = 0; i < results.DfIn.length; i++) {
          var rIn = results.DfIn[i], rSz = results.DfSz[i],
            used = +rSz.Used, free = +rSz.Available;
          if (rIn.Type !== 'tmpfs') result.push({
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
};
