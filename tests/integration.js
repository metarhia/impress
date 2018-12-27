'use strict';

const path = require('path');
const metatests = require('metatests');

process.chdir(path.resolve(__dirname, '..'));
require('../lib/core');

if (impress.isMaster) {
  impress.on('started', () => {
    metatests.runner.instance.on('finish', hasErrors => {
      impress.shutdown(hasErrors ? 1 : 0);
    });

    require('./jstp');
    require('./http');
  });
}

impress.start();
