'use strict';

var fs = require('fs');

fs.exists('./tests', function(fileExists) {
  if (fileExists) require('./lib/impress');
  else require('impress');
  impress.server.start();
});
