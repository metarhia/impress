'use strict';

// Logging for Impress Application Server

const LOG_TYPES = {
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

const FILE_TYPES = Object.keys(LOG_TYPES);

const DAY_MILLISECONDS = api.common.duration('1d');
const SEMICOLON_REGEXP = /;/g;

const cError = api.concolor('b,red');
const cDebug = api.concolor('b,green');
const cWarn = api.concolor('b,yellow');

const mixin = (application) => {

  const log = {};
  application.log = log;
  log.dir = application.dir + '/log';
  log.files = new Map();
  // item structure: { fd, buf, timer, lock }

  log.init = () => {

    log.active = false;

    const defConfig = impress.config.log;
    const appConfig = application.config.log;

    log.fileTypes = appConfig.files || FILE_TYPES;
    const writeInterval = appConfig.writeInterval || defConfig.writeInterval;
    const writeBuffer = appConfig.writeBuffer || defConfig.writeBuffer;
    const keepDays = appConfig.keepDays || defConfig.keepDays;

    const makeTimer = (fileType) => () => log.flush(fileType);

    log.open = (callback) => {
      callback = api.common.once(callback);
      if (!appConfig.enabled) {
        callback();
        return;
      }
      api.mkdirp(log.dir, (err) => {
        if (err) {
          console.error(err);
          callback();
          return;
        }
        const now = new Date();
        const nextDate = new Date();
        api.metasync.each(
          log.fileTypes,
          (fileType, cb) => {
            log.openFile(fileType, cb);
          },
          () => {
            log.active = true;
            callback();
          }
        );
        nextDate.setUTCHours(0, 0, 0, 0);
        const nextReopen = nextDate - now + DAY_MILLISECONDS;
        api.timers.setTimeout(log.open, nextReopen);
        if (keepDays && process.isMaster) {
          log.deleteOldFiles();
        }
      });
    };

    log.openFile = (fileType, callback) => {
      const logType = LOG_TYPES[fileType];
      const forMaster = logType === 'master';
      const perWorker = logType === 'http' || logType === 'jstp';
      const isShared = logType === 'shared';
      if (!forMaster) {
        if (process.isMaster) {
          callback();
          return;
        }
        if (!isShared && logType !== impress.serverProto) {
          callback();
          return;
        }
      }
      const date = api.common.nowDate();
      let fileName = log.dir + '/' + date + '-' + fileType;
      if (perWorker) fileName += '-' + impress.nodeId;
      fileName += '.log';
      log.closeFile(fileType, () => {
        const fd = api.fs.createWriteStream(fileName, {
          flags: 'a', highWaterMark: writeBuffer
        });
        const timer = api.timers.setInterval(
          makeTimer(fileType),
          writeInterval
        );
        const file = { fd, buf: '', lock: false, timer };
        log.files.set(fileType, file);
        file.fd.on('open', callback);
        file.fd.on('error', callback);
      });
    };

    log.close = (callback) => {
      log.active = false;
      if (!appConfig.enabled) {
        callback();
        return;
      }
      api.metasync.each(
        log.fileTypes, log.closeFile, callback
      );
    };

    log.closeFile = (fileType, callback) => {
      const file = log.files.get(fileType);
      if (!file) {
        callback();
        return;
      }
      const filePath = file.fd.path;
      log.flush(fileType, () => {
        if (file.fd.destroyed || file.fd.closed) {
          callback();
          return;
        }
        file.fd.end(() => {
          api.timers.clearInterval(file.timer);
          log.files.delete(fileType);
          api.fs.stat(filePath, (err, stats) => {
            if (err || stats.size > 0) {
              callback();
              return;
            }
            api.fs.unlink(filePath, callback);
          });
        });
      });
    };

    log.deleteOldFiles = () => {
      api.fs.readdir(log.dir, (err, files) => {
        if (err) return;
        const now = new Date();
        const date = new Date(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
        );
        const time = date.getTime();
        const cb = api.common.emptiness;
        let i, fileTime, fileAge;
        for (i in files) {
          fileTime = new Date(files[i].substring(0, 10)).getTime();
          fileAge = Math.floor((time - fileTime) / DAY_MILLISECONDS);
          if (fileAge > 1 && fileAge > keepDays) {
            api.fs.unlink(log.dir + '/' + files[i], cb);
          }
        }
      });
    };

    log.write = (fileType, message) => {
      let msg = (
        new Date().toISOString() + '\t' +
        impress.processMarker + '\t' + message + '\n'
      );
      if (
        appConfig &&
        appConfig.stdout &&
        defConfig.stdout.includes(fileType)
      ) {
        msg = msg.substring(0, msg.length - 1);
        msg = msg.replace(SEMICOLON_REGEXP, '\n ');
        /**/ if (fileType === 'error') msg = cError(msg);
        else if (fileType === 'debug') msg = cDebug(msg);
        else if (fileType === 'warning') msg = cWarn(msg);
        console.log(msg);
      } else {
        const file = log.files.get(fileType);
        if (file) file.buf += msg;
      }
    };

    log.flush = (fileType, callback) => {
      callback = api.common.once(callback);
      const file = log.files.get(fileType);
      if (!file || file.lock || file.buf.length === 0) {
        callback();
        return;
      }
      file.lock = true;
      const buf = file.buf;
      file.buf = '';
      file.fd.write(buf, () => {
        file.lock = false;
        callback();
      });
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
    api.metasync.each(log.fileTypes, (fileType /*cb*/) => {
      const fnN = api.common.emptiness;
      const fnA = (message) => {
        log.write(fileType, message);
      };
      const fnI = (message) => {
        impress.log.write(fileType, '[' + application.name + ']\t' + message);
      };
      const fnAI = (message) => {
        log.write(fileType, message);
        impress.log.write(fileType, '[' + application.name + ']\t' + message);
      };

      let logger = fnN;
      if (!application.isImpress && appConfig.enabled && defConfig.enabled) {
        logger = fnAI;
      } else if (appConfig.enabled) {
        logger = fnA;
      } else if (defConfig.enabled) {
        logger = fnI;
      }
      log[fileType] = logger;
    });

  };

};

module.exports = {
  mixinImpress: mixin,
  mixinApplication: mixin
};
