'use strict';

// Logging for Impress Application Server

impress.log.logTypes = {
  access: 'http',
  api: 'jstp',
  error: 'shared',
  debug: 'shared',
  slow: 'http',
  server: 'master',
  node: 'shared',
  cloud: 'master',
  warning: 'shared'
};

impress.log.fileTypes = Object.keys(impress.log.logTypes);

const DAY_MILLISECONDS = api.common.duration('1d');
const SEMICOLON_REGEXP = /;/g;

// This plugin should be mixed to impress application

impress.log.mixImpress = true;

impress.log.mixin = (application) => {

  application.log.dir = application.dir + '/log';
  application.log.files = {}; // item structure: { fd, buf, timer, lock }

  application.log.init = () => {

    application.log.active = false;

    application.log.fileTypes = (
      application.config.log.files || impress.log.fileTypes
    );

    const makeTimer = (fileType) => (
      () => application.log.flush(fileType, api.common.emptyness)
    );

    const writeInterval = (
      api.common.getByPath(application.config, 'log.writeInterval') ||
      api.common.getByPath(impress.config, 'log.writeInterval')
    );

    const writeBuffer = (
      api.common.getByPath(application.config, 'log.writeBuffer') ||
      api.common.getByPath(impress.config, 'log.writeBuffer')
    );

    const keepDays = (
      api.common.getByPath(application.config, 'log.keepDays') ||
      api.common.getByPath(impress.config, 'log.keepDays')
    );

    let applicationLog;
    if (application.config.log && 'applicationLog' in application.config.log) {
      applicationLog = application.config.log.applicationLog;
    } else if (impress.config.log && 'applicationLog' in impress.config.log) {
      applicationLog = impress.config.log.applicationLog;
    } else {
      applicationLog = false;
    }

    let serverLog;
    if (application.config.log && 'serverLog' in application.config.log) {
      serverLog = application.config.log.serverLog;
    } else if (impress.config.log && 'serverLog' in impress.config.log) {
      serverLog = impress.config.log.serverLog;
    } else {
      serverLog = true;
    }

    application.log.open = (callback) => {
      if (application === impress || applicationLog) {
        api.mkdirp(application.log.dir, (err) => {
          if (err) {
            console.error(err);
            return callback();
          }
          const now = new Date();
          const nextDate = new Date();
          api.metasync.each(
            application.log.fileTypes,
            (fileType, cb) => {
              application.log.openFile(fileType, cb);
            },
            () => {
              application.log.active = true;
              callback();
            }
          );
          nextDate.setUTCHours(0, 0, 0, 0);
          const nextReopen = nextDate - now + DAY_MILLISECONDS;
          api.timers.setTimeout(application.log.open, nextReopen);
          if (keepDays && process.isMaster) {
            application.log.deleteOldFiles();
          }
        });
      } else {
        callback();
      }
    };

    application.log.openFile = (fileType, callback) => {
      const logType = impress.log.logTypes[fileType];
      const forMaster = logType === 'master';
      const perWorker = logType === 'http' || logType === 'jstp';
      const isShared = logType === 'shared';
      if (!forMaster) {
        if (process.isMaster) return callback();
        if (!isShared && logType !== impress.serverProto) return callback();
      }
      const date = api.common.nowDate();
      let fileName = application.log.dir + '/' + date + '-' + fileType;
      if (perWorker) fileName += '-' + impress.nodeId;
      fileName += '.log';
      application.log.closeFile(fileType, () => {
        const fd = api.fs.createWriteStream(fileName, {
          flags: 'a', highWaterMark: writeBuffer
        });
        const timer = api.timers.setInterval(
          makeTimer(fileType),
          writeInterval
        );
        const file = { fd, buf: '', lock: false, timer };
        application.log.files[fileType] = file;
        file.fd.on('open', callback);
        file.fd.on('error', callback);
      });
    };

    application.log.close = (callback) => {
      application.log.active = false;
      if (application === impress || applicationLog) {
        api.metasync.each(
          application.log.fileTypes,
          application.log.closeFile,
          callback
        );
      } else callback();
    };

    application.log.closeFile = (fileType, callback) => {
      const file = application.log.files[fileType];
      if (file) {
        const filePath = file.fd.path;
        application.log.flush(fileType, () => {
          if (file.fd.destroyed || file.fd.closed) callback();
          else file.fd.end(() => {
            api.timers.clearInterval(file.timer);
            delete application.log.files[fileType];
            const logType = impress.log.logTypes[fileType];
            const perWorker = logType === 'http' || logType === 'jstp';
            if (process.isMaster || perWorker) {
              api.fs.stat(filePath, (err, stats) => {
                if (stats && stats.size === 0) {
                  api.fs.unlink(filePath, callback);
                } else callback();
              });
            } else callback();
          });
        });
      } else callback();
    };

    application.log.deleteOldFiles = () => {
      api.fs.readdir(application.log.dir, (err, files) => {
        if (!err) {
          let now = new Date();
          now = new Date(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
          );
          let i, fileDate, fileAge;
          for (i in files) {
            fileDate = new Date(files[i].substring(0, 10));
            fileAge = Math.floor(
              (now.getTime() - fileDate.getTime()) / DAY_MILLISECONDS
            );
            if (fileAge > 1 && fileAge > keepDays) {
              api.fs.unlink(
                application.log.dir + '/' + files[i],
                api.common.emptyness
              );
            }
          }
        }
      });
    };

    application.log.write = (fileType, message) => {
      const file = application.log.files[fileType];
      if (file) {
        let msg = (
          (new Date()).toISOString() + '\t' +
          impress.processMarker + '\t' + message + '\n'
        );
        file.buf += msg;
        if (
          application.config.log &&
          application.config.log.stdout &&
          impress.config.log.stdout.includes(fileType)
        ) {
          msg = msg.substring(0, msg.length - 1);
          msg = msg.replace(SEMICOLON_REGEXP, '\n ');
          /**/ if (fileType === 'error') msg = msg.red.bold;
          else if (fileType === 'debug') msg = msg.green.bold;
          else if (fileType === 'warning') msg = msg.yellow.bold;
          console.log(msg);
        }
      }
    };

    application.log.flush = (fileType, callback) => {
      const file = application.log.files[fileType];
      if (file && !file.lock && file.buf.length > 0) {
        file.lock = true;
        const buf = file.buf;
        file.buf = '';
        file.fd.write(buf, () => {
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
    //   application.log.cloud(message)
    //   application.log.warning(message)
    //
    api.metasync.each(application.log.fileTypes, (fileType /*cb*/) => {
      const fnN = (/*message*/) => {};
      const fnA = (message) => (
        application.log.write(fileType, message)
      );
      const fnI = (message) => (
        impress.log.write(fileType, '[' + application.name + ']\t' + message)
      );
      const fnAI = (message) => {
        application.log.write(fileType, message);
        impress.log.write(fileType, '[' + application.name + ']\t' + message);
      };
      let fn;
      if (application === impress) {
        if (!serverLog) fn = fnN;
        else fn = fnI;
      } else if (!serverLog && !applicationLog) {
        fn = fnN;
      } else if (!serverLog && applicationLog) {
        fn = fnA;
      } else if (serverLog && !applicationLog) {
        fn = fnI;
      } else if (serverLog && applicationLog) {
        fn = fnAI;
      }
      application.log[fileType] = fn;
    });

  };

};
