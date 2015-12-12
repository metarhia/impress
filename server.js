'use strict';

var fs = require('fs');

fs.exists('./tests', function(fileExists) {
  if (fileExists) require('./lib/impress');
  else require('impress');
  //api.impress.logApiMethod('fs.readdir');
  impress.server.start();
});
