'use strict';

require('colors');

global.api = {};
api.fs = require('fs');
api.cp = require('child_process');
api.ncp = require('ncp').ncp;
api.path = require('path');

var isWin = !!process.platform.match(/^win/);

api.ncp.limit = 16;

var current = api.path.dirname(__filename.replace(/\\/g, '/')),
    parent = api.path.basename(api.path.dirname(current)),
    destination = api.path.dirname(api.path.dirname(current)),
    exists = false;

// Execute shell command displaying output and possible errors
//
function execute(cmd, callback) {
  api.cp.exec(cmd, function(error, stdout /* stderr */) {
    if (error) console.log(error.toString());
    else console.log(stdout);
    if (callback) callback();
  });
}

// Install CLI
//
function installCLI() {
  execute('npm install --unsafe-perm impress-cli -g', function() {
    execute('impress path ' + destination, function() {
      if (!isWin) execute('impress autostart on');
    });
  });
}

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

api.common.each(['package.json', 'server.js', 'config', 'applications'], function(file, callback) {
  api.fs.exists(destination + '/' + file, function(fileExists) {
    exists = exists || fileExists;
    callback();
  });
}, function() {
  if (exists) console.log('Impress Application Server'.bold.green + ' is already installed and configured in this folder.');
  else {
    console.log('Installing Impress Application Server...'.bold.green);
    api.fs.createReadStream(current + '/server.js').pipe(api.fs.createWriteStream(destination + '/server.js'));
    api.fs.createReadStream(current + '/lib/package.template.json').pipe(api.fs.createWriteStream(destination + '/package.json'));
    var shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    api.fs.createReadStream(current + '/' + shellScript).pipe(api.fs.createWriteStream(destination + '/' + shellScript));
    api.ncp(current + '/config', destination + '/config', { clobber: false }, function (err) {
      if (err) console.error(err);
      api.ncp(current + '/applications', destination + '/applications', { clobber: false }, function (err) {
        if (err) console.error(err);
        else {
          if (!isWin) execute('chmod +x ' + destination +'/server.sh', installCLI);
          else installCLI();
        }
      });
    });
  }
});
