'use strict';

const fs = require('fs');

fs.access('./tests', (err) => {
  if (!err) require('./lib/impress');
  else require('impress');
  impress.server.start();
});
