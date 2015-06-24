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
    destination = path.dirname(path.dirname(current)),
    exists = false;

// Execute shell command displaying output and possible errors
//
function execute(cmd, callback) {
  exec(cmd, function(error, stdout /* stderr */) {
    if (error) console.log(error.toString());
    else console.log(stdout);
    if (callback) callback();
  });
}

// Install CLI
//
function installCLI() {
  execute('npm install impress-cli -g', function() {
    execute('impress path ' + destination, function() {
      if (!isWin) execute('impress autostart on');
    });
  });
}

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

async.each(['package.json', 'server.js', 'config', 'applications'], function(file, callback) {
  fs.exists(destination + '/' + file, function(fileExists) {
    exists = exists || fileExists;
    callback();
  });
}, function() {
  if (exists) console.log('Impress Application Server'.bold.green + ' is already installed and configured in this folder.');
  else {
    console.log('Installing Impress Application Server...'.bold.green);
    fs.createReadStream(current + '/server.js').pipe(fs.createWriteStream(destination + '/server.js'));
    fs.createReadStream(current + '/package.template.json').pipe(fs.createWriteStream(destination + '/package.json'));
    var shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    fs.createReadStream(current + '/' + shellScript).pipe(fs.createWriteStream(destination + '/' + shellScript));
    ncp(current + '/config', destination + '/config', { clobber: false }, function (err) {
      if (err) console.error(err);
      ncp(current + '/applications', destination + '/applications', { clobber: false }, function (err) {
        if (err) console.error(err);
        else {
          if (!isWin) execute('chmod +x ' + destination +'/server.sh', installCLI);
          else installCLI();
        }
      });
    });
  }
});
