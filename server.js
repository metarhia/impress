'use strict';

var fs = require('fs');

fs.exists('./unittests.js', function(fileExists) {
  if (fileExists) require('./lib/impress');
  else require('impress');
  impress.server.start();
});
