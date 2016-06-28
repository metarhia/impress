'use strict';

// Logging for Impress Application Server

// System log files set
impress.log.fileTypes = [
  'access', 'error', 'debug', 'slow', 'server', 'node', 'cluster', 'cloud', 'warning'
];

var DAY_MILLISECONDS = api.common.duration('1d'),
    SEMICOLON_REGEXP = /;/g;

// This plugin should be mixed to impress application
//
impress.log.mixImpress = true;

// Mixin logging to application instance
//
impress.log.mixin = function(application) {

  application.log.dir = application.dir + '/log';
  application.log.files = {}; // item structure: { fd, buf, timer, lock }

  application.log.init = function() {

    application.log.fileTypes = application.config.log.files || impress.log.fileTypes;

    var makeTimer = function(fileType) {
      return function() {
        application.log.flush(fileType, api.common.emptyness);
      };
    };

    var writeInterval = api.common.getByPath(application.config, 'log.writeInterval');
    if (!writeInterval) {
      writeInterval = api.common.getByPath(impress.config, 'log.writeInterval');
    }

    var writeBuffer = api.common.getByPath(application.config, 'log.writeBuffer');
    if (!writeBuffer) {
      writeBuffer = api.common.getByPath(impress.config, 'log.writeBuffer');
    }

    var keepDays = api.common.getByPath(application.config, 'log.keepDays');
    if (!keepDays) {
      keepDays = api.common.getByPath(impress.config, 'log.keepDays');
    }

    var applicationLog;
    if (application.config.log && 'applicationLog' in application.config.log) {
      applicationLog = application.config.log.applicationLog;
    } else if (impress.config.log && 'applicationLog' in impress.config.log) {
      applicationLog = impress.config.log.applicationLog;
    } else {
      applicationLog = false;
    }

    var serverLog;
    if (application.config.log && 'serverLog' in application.config.log) {
      serverLog = application.config.log.serverLog;
    } else if (impress.config.log && 'serverLog' in impress.config.log) {
      serverLog = impress.config.log.serverLog;
    } else {
      serverLog = true;
    }

    // Open log files
    //
    application.log.open = function(callback) {
      if (application === impress || applicationLog) {
        api.mkdirp(application.log.dir, function(err) {
          if (err) {
            console.error(err);
          } else {
            var now = new Date(),
                nextDate = new Date();
            api.common.each(application.log.fileTypes, function(fileType, cb) {
              application.log.openFile(fileType, cb);
            }, callback);
            nextDate.setUTCHours(0, 0, 0, 0);
            var nextReopen = nextDate - now + DAY_MILLISECONDS;
            api.timers.setTimeout(application.log.open, nextReopen);
            if (keepDays && process.isMaster) {
              application.log.deleteOldFiles();
            }
          }
        });
      } else callback();
    };

    // Open log files
    //
    application.log.openFile = function(fileType, callback) {
      var date = api.common.nowDate(),
          fileName = application.log.dir + '/' + date + '-' + fileType + '.log';
      application.log.closeFile(fileType, function() {
        var file = {
          fd: api.fs.createWriteStream(fileName, {
            flags: 'a',
            highWaterMark: writeBuffer
          }),
          buf: '',
          lock: false,
          timer: api.timers.setInterval(makeTimer(fileType), writeInterval)
        };
        application.log.files[fileType] = file;
        file.fd.on('open', callback);
        file.fd.on('error', callback);
      });
    };

    // Close log files
    //
    application.log.close = function(callback) {
      if (application === impress || applicationLog) {
        api.common.each(application.log.fileTypes, function(fileType, cb) {
          application.log.closeFile(fileType, cb);
        }, callback);
      } else callback();
    };

    // Close log file of specified type
    //
    application.log.closeFile = function(fileType, callback) {
      var file = application.log.files[fileType];
      if (file) {
        var filePath = file.fd.path;
        application.log.flush(fileType, function() {
          if (file.fd.destroyed || file.fd.closed) callback();
          else file.fd.end(function() {
            api.timers.clearInterval(file.timer);
            delete application.log.files[fileType];
            if (process.isMaster) {
              api.fs.stat(filePath, function(err, stats) {
                if (stats && (stats.size === 0)) {
                  api.fs.unlink(filePath, callback);
                } else callback();
              });
            } else callback();
          });
        });
      } else callback();
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
            fileAge = Math.floor((now.getTime() - fileDate.getTime()) / DAY_MILLISECONDS);
            if (fileAge > 1 && fileAge > keepDays) {
              api.fs.unlink(application.log.dir + '/' + files[i], api.common.emptyness);
            }
          }
        }
      });
    };

    // Write message to log
    //
    application.log.write = function(fileType, message) {
      var file = application.log.files[fileType];
      if (file) {
        var msg = (new Date()).toISOString() + '\t' + impress.processMarker + '\t' + message + '\n';
        file.buf += msg;
        if (
          application.config.log &&
          application.config.log.stdout &&
          api.common.inArray(impress.config.log.stdout, fileType)
        ) {
          msg = msg.substring(0, msg.length - 1).replace(SEMICOLON_REGEXP, '\n ');
          /**/ if (fileType === 'error') msg = msg.red.bold;
          else if (fileType === 'debug') msg = msg.green.bold;
          else if (fileType === 'warning') msg = msg.yellow.bold;
          console.log(msg);
        }
      }
    };

    // Flush file buffer
    //
    application.log.flush = function(fileType, callback) {
      var file = application.log.files[fileType];
      if (file && !file.lock && file.buf.length > 0) {
        file.lock = true;
        var buf = file.buf;
        file.buf = '';
        file.fd.write(buf, function() {
          file.lock = false;
          callback();
        });
      } else callback();
    };

    // Generate log methods, for example:
    //   application.log.access(message)
    //   application.log.error(message)
    //   application.log.debug(message)
    //   application.log.slow(message)
    //   application.log.server(message)
    //   application.log.node(message)
    //   application.log.cluster(message)
    //   application.log.cloud(message)
    //   application.log.warning(message)
    //
    api.common.each(application.log.fileTypes, function(fileType /*cb*/) {
      var fnN = function(/*message*/) {
      };
      var fnA = function(message) {
        application.log.write(fileType, message);
      };
      var fnI = function(message) {
        impress.log.write(fileType, '[' + application.name + ']\t' + message);
      };
      var fnAI = function(message) {
        application.log.write(fileType, message);
        impress.log.write(fileType, '[' + application.name + ']\t' + message);
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
    });

  };

};
