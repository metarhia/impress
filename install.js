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
    destination = path.dirname(path.dirname(current)) + '/',
    source = current + '/examples/exampleApplication/',
    exists = false;

function installCLI() {
  console.log('npm install impress-cli -g');
  exec('npm install impress-cli -g', function() {
    console.log('impress path ' + current);
    exec('impress path ' + current, function() {
      console.log('impress path ' + current);
      exec('impress autostart on', function() {
        console.log('Done!');
      });
    });
  });
}

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

async.each(['server.js', 'config', 'applications'], function(file, callback) {
  fs.exists(destination + file, function(fileExists) {
    exists = exists || fileExists;
    callback();
  });
}, function() {
  if (exists) console.log('Impress Application Server'.bold.green + ' is already installed and configured in this folder.');
  else {
    console.log('Installing Impress Application Server...'.bold.green);
    fs.createReadStream(source + 'server.js').pipe(fs.createWriteStream(destination+'server.js'));
    var shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    fs.createReadStream(source + shellScript).pipe(fs.createWriteStream(destination+shellScript));
    ncp(source + 'config', destination + 'config', { clobber: false }, function (err) {
      if (err) console.error(err);
      ncp(source + 'applications', destination + 'applications', { clobber: false }, function (err) {
        if (err) console.error(err);
        installCLI();
      });
    });
  }
});
