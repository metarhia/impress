'use strict';

// Logging for Impress Application Server

const mixin = application => {

  const log = {};
  application.log = log;

  log.init = () => {

    const config = impress.config.sections.log;
    const logDir = impress.dir + '/log';

    api.mkdirp.sync(logDir);
    const log = api.metalog({
      path: logDir,
      nodeId: impress.nodeId,
      writeInterval: config.writeInterval,
      writeBuffer: config.writeBuffer,
      keepDays: config.keepDays,
      stdout: config.stdout,
      toFile: config.toFile
    });
    application.log = log;

  };

};

module.exports = {
  mixinImpress: mixin,
};
