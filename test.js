'use strict';

const metatests = require('metatests');

const reporterType = process.stdout.isTTY ? 'classic' : 'tap';
metatests.runner.instance.setReporter(
  new metatests.reporters.TapReporter({ type: reporterType })
);

require('./lib/core');

if (impress.isMaster) {
  impress.on('testsFinished', errors => {
    impress.shutdown(errors ? 1 : 0);
  });
}

impress.start();
