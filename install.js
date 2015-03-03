'use strict';

require('colors');

var fs = require('fs'),
    path = require('path'),
    ncp = require('ncp').ncp,
    exec = require('child_process').exec,
    async = require('async');

var isWin = !!process.platform.match(/^win/);

ncp.limit = 16;

var current = path.dirname(__filename.replace(/\\/g, '/')),
    parent = path.basename(path.dirname(current)),
    destination = path.dirname(path.dirname(current))+'/',
    source = current+'/examples/exampleApplication/',
    exists = false;

function installService() {
  exec('chmod +x ./bin/install.sh', function() {
    exec('chmod +x ./bin/uninstall.sh');
    exec('chmod +x ./bin/impress');
    exec('chmod +x ./server.sh');
    exec('./bin/install.sh');
  });
}

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

async.each(['server.js', 'config', 'applications'], function(file, callback) {
  fs.exists(destination+file, function(fileExists) {
    exists = exists || fileExists;
    callback();
  });
}, function() {
  if (exists) {
    console.log('Impress Application Server'.bold.green+' is already installed and configured in this folder.');
    if (destination === '/impress/') {
      console.log('Refreshing service scripts.');
      installService();
    }
  } else {
    console.log('Installing Impress Application Server...'.bold.green);
    fs.createReadStream(source+'server.js').pipe(fs.createWriteStream(destination+'server.js'));
    var shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    fs.createReadStream(source+shellScript).pipe(fs.createWriteStream(destination+shellScript));
    ncp(source+'config', destination+'config', { clobber: false }, function (err) {
      if (err) console.error(err);
      ncp(source+'applications', destination+'applications', { clobber: false }, function (err) {
        if (err) console.error(err);
        if (!isWin) {
          if (destination === '/impress/') {
            console.log('Installing Impress Application Server as a service.');
            console.log('  Usage: service impress start|stop|restart|status');
            installService();
          } else {
            console.log(
              'To install Impress Application Server as a service to start automatically during the system startup you need to create directory '+
              '/impress'.bold.green+' and run '+'npm install impress'.bold.green+' in this directory.'
            );
          }
        }
      });
    });
  }
});
