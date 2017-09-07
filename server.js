'use strict';

const fs = require('fs');

fs.access('./tests', (err) => {
  if (!err) require('./lib/impress');
  else require('impress'); // eslint-disable-line import/no-unresolved
  impress.server.start();
});
