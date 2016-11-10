'use strict';

require('colors');

global.api = {};
api.fs = require('fs');
api.cp = require('child_process');
api.ncp = require('ncp').ncp;
api.path = require('path');
api.metasync = require('metasync');
api.common = {};
require(process.cwd() + '/lib/api.common.js');

var isWin = !!process.platform.match(/^win/);

api.ncp.limit = 16;

var current = api.path.dirname(__filename.replace(/\\/g, '/'));
var parent = api.path.basename(api.path.dirname(current));
var destination = api.path.dirname(api.path.dirname(current));
var exists = false;

var jstpPath = api.path.dirname(require.resolve('metarhia-jstp'));
var jstpDistPath = api.path.join(jstpPath, 'dist');
var staticJsDir = api.path.resolve(__dirname, 'applications/example/static/js');

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

// Copy the browser version of JSTP
//
['jstp.min.js', 'jstp.min.js.map'].forEach(function(file) {
  var source = api.path.join(jstpDistPath, file);
  var dest = api.path.join(staticJsDir, file);

  var data = api.fs.readFileSync(source);
  api.fs.writeFileSync(dest, data);
});

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

api.metasync.each(['package.json', 'server.js', 'config', 'applications'], function(file, callback) {
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
