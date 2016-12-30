'use strict';

const fs = require('fs');

fs.exists('./tests', (fileExists) => {
  if (fileExists) require('./lib/impress');
  else require('impress');
  impress.server.start();
});
