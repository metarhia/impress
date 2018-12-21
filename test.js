'use strict';

require('./lib/core');

if (impress.isMaster) {
  impress.on('testsFinished', errors => {
    impress.shutdown(errors ? 1 : 0);
  });
}

impress.start();
