'use strict';

const fs = require('fs');

fs.access('./tests', (err) => {
  if (!err) require('./lib/core');
  else require('core'); // eslint-disable-line import/no-unresolved
  impress.start();
});
