"use strict";

impress.log = {};

// System log files set
impress.log.fileTypes = [ 'access', 'error', 'debug', 'slow', 'server' ];

var dayMilliseconds = duration('1d'),
    defaultWriteInterval = '5s',
    defaultWriteBuffer = 64 * 1024;

// Mixin logging to application instance
//
impress.log.mixinApplication = function (application) {

  application.log = application.log || {};
  application.log.fileTypes = application.log.fileTypes || [ 'access', 'error', 'debug', 'slow' ];
  application.log.dir = application.dir+'/log';
  application.log.files = {}; // item = { fd, buf, timer, lock }

  var makeTimer = function(fileType) {
    return function() {
      application.log.flush(fileType);
    };
  };

  var writeInterval;
  if (application.config.log && application.config.log.writeInterval) writeInterval = duration(application.config.log.writeInterval);
  else if (impress.config.log && impress.config.log.writeInterval) writeInterval = duration(impress.config.log.writeInterval);
  else writeInterval = duration(defaultWriteInterval);

  var writeBuffer;
  if (application.config.log && application.config.log.writeBuffer) writeBuffer = application.config.log.writeBuffer;
  else if (impress.config.log && impress.config.log.writeBuffer) writeBuffer = impress.config.log.writeBuffer;
  else writeBuffer = defaultWriteBuffer;

  var keepDays;
  if (application.config.log && application.config.log.keepDays) keepDays = application.config.log.keepDays;
  else if (impress.config.log && impress.config.log.keepDays) keepDays = impress.config.log.keepDays;
  else keepDays = null;

  var applicationLog;
  if (application.config.log && 'applicationLog' in application.config.log) applicationLog = application.config.log.applicationLog;
  else if (impress.config.log && 'applicationLog' in impress.config.log) applicationLog = impress.config.log.applicationLog;
  else applicationLog = false;

  var serverLog;
  if (application.config.log && 'serverLog' in application.config.log) serverLog = application.config.log.serverLog;
  else if (impress.config.log && 'serverLog' in impress.config.log) serverLog = impress.config.log.serverLog;
  else serverLog = true;

  // Open log files
  //
  application.log.open = function(callback) {
    if (application === impress || applicationLog) {
      api.mkdirp(application.log.dir, function(err) {
        if (err) console.error(err);
        else {
          var now = new Date(),
              fileType,
              cbCount = application.log.fileTypes.length,
              cbIndex = 0,
              cb = function() { if (++cbIndex>=cbCount && callback) callback(); };
          for (var i = 0; i < application.log.fileTypes.length; i++) {
            fileType = application.log.fileTypes[i];
            application.log.openFile(fileType, cb);
          }
          var nextDate = new Date();
          nextDate.setUTCHours(0, 0, 0, 0);
          var nextReopen = nextDate - now + dayMilliseconds;
          setTimeout(application.log.open, nextReopen);
          if (keepDays && api.cluster.isMaster) application.log.deleteOldFiles();
        }
      });
    } else callback();
  };

  // Open log files
  //
  application.log.openFile = function(fileType, callback) {
    var date = impress.nowDate(),
        fileName = application.log.dir+'/'+date+'-'+fileType+'.log';
    application.log.closeFile(fileType, function() {
      var file = {
        fd: api.fs.createWriteStream(fileName, { flags:'a', highWaterMark:writeBuffer }),
        buf: '',
        lock: false,
        timer: setInterval(makeTimer(fileType), writeInterval)
      };
      application.log.files[fileType] = file;
      file.fd.on('open',  function()  { if (callback) callback(); });
      file.fd.on('error', function () { if (callback) callback(); });
    });
  };

  // Close log files
  //
  application.log.close = function(callback) {
    if (application === impress || applicationLog) {
      var cbCount = application.log.fileTypes.length,
          cbIndex = 0,
          fileType;
      for (var i = 0; i < application.log.fileTypes.length; i++) {
        fileType = application.log.fileTypes[i];
        application.log.closeFile(fileType, function() {
          if (++cbIndex>=cbCount && callback) callback();
        });
      }
    } else callback();
  };

  // Close log file of specified type
  //
  application.log.closeFile = function(fileType, callback) {
    var file = application.log.files[fileType];
    if (file) {
      var filePath = file.fd.path;
      application.log.flush(fileType, function() {
        file.fd.end(function() {
          clearInterval(file.timer);
          delete application.log.files[fileType];
          if (api.cluster.isMaster) {
            api.fs.stat(filePath, function(err, stats) {
              if (stats && (stats.size === 0)) api.fs.unlink(filePath, function () {
                if (callback) callback();
              }); else if (callback) callback();
            });
          } else if (callback) callback();
        });
      });
    } else if (callback) callback();
  };

  // Delete old log files
  //
  application.log.deleteOldFiles = function() {
    api.fs.readdir(application.log.dir, function(err, files) {
      if (!err) {
        var now = new Date();
        now = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
        var fileDate, fileAge;
        for (var i in files) {
          fileDate = new Date(files[i].substring(0, 10));
          fileAge = Math.floor((now.getTime()-fileDate.getTime()) / dayMilliseconds);
          if (fileAge>1 && fileAge>keepDays) {
            api.fs.unlink(application.log.dir+'/'+files[i], function(err) { });
          }
        }
      }
    });
  };

  // Write message to log
  //
  application.log.write = function(fileType, message) {
    var file = application.log.files[fileType];
    if (file) file.buf += (new Date()).toISOString()+'\t'+impress.processMarker+'\t'+message+'\n';
  };

  // Flush file buffer
  //
  application.log.flush = function(fileType, callback) {
    var file = application.log.files[fileType];
    if (file && !file.lock && file.buf.length>0) {
      file.lock = true;
      var buf = file.buf;
      file.buf = '';
      file.fd.write(buf, function() {
        file.lock = false;
        if (callback) callback();
      });
    } else if (callback) callback();
  };

  // Generate log methods, for example:
  //   application.log.access(message)
  //   application.log.error(message)
  //   application.log.debug(message)
  //   application.log.slow(message)
  //   application.log.server(message)
  //
  for (var i = 0; i < application.log.fileTypes.length; i++) {
    (function() {
      var fileType = application.log.fileTypes[i];
      var fnN = function(message) {
      };
      var fnA = function(message) {
        application.log.write(fileType, message);
      };
      var fnI = function(message) {
        impress.log.write(fileType, message);
      };
      var fnAI = function(message) {
        application.log.write(fileType, message);
        impress.log.write(fileType, message);
      };
      var fn;
      if (application === impress) {
        if (!serverLog) fn = fnN;
        else fn = fnI;
      } else {
        if (!serverLog && !applicationLog) fn = fnN;
        else if (!serverLog && applicationLog) fn = fnA;
        else if (serverLog && !applicationLog) fn = fnI;
        else if (serverLog && applicationLog) fn = fnAI;
      }
      application.log[fileType] = fn;
    } ());
  }

};
