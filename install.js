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

const isWin = !!process.platform.match(/^win/);

api.ncp.limit = 16;

let current = api.path.dirname(__filename.replace(/\\/g, '/'));
let parent = api.path.basename(api.path.dirname(current));
let destination = api.path.dirname(api.path.dirname(current));
let exists = false;

let jstpPath = api.path.dirname(require.resolve('metarhia-jstp'));
let jstpDistPath = api.path.join(jstpPath, 'dist');
let staticJsDir = api.path.resolve(__dirname, 'applications/example/static/js');

// Execute shell command displaying output and possible errors
//
function execute(cmd, callback) {
  api.cp.exec(cmd, (error, stdout /* stderr */) => {
    if (error) console.log(error.toString());
    else console.log(stdout);
    if (callback) callback();
  });
}

// Install CLI
//
function installCLI() {
  execute('npm install --unsafe-perm impress-cli -g', () => {
    execute('impress path ' + destination, () => {
      if (!isWin) execute('impress autostart on');
    });
  });
}

// Copy the browser version of JSTP
//
['jstp.min.js', 'jstp.min.js.map'].forEach((file) => {
  let source = api.path.join(jstpDistPath, file);
  let dest = api.path.join(staticJsDir, file);

  let data = api.fs.readFileSync(source);
  api.fs.writeFileSync(dest, data);
});

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

let checkFiles = ['package.json', 'server.js', 'config', 'applications'];
api.metasync.each(checkFiles, check, done);

function check(file, callback) {
  api.fs.exists(destination + '/' + file, (fileExists) => {
    exists = exists || fileExists;
    callback();
  });
}

function done() {
  if (exists) {
    console.log(
      'Impress Application Server'.bold.green +
      ' is already installed and configured in this folder.'
    );
  } else {
    console.log('Installing Impress Application Server...'.bold.green);
    let sSrv = api.fs.createReadStream(current + '/server.js');
    let dSrv = api.fs.createWriteStream(destination + '/server.js');
    sSrv.pipe(dSrv);
    let sPkg = api.fs.createReadStream(current + '/lib/package.template.json');
    let dPkg = api.fs.createWriteStream(destination + '/package.json');
    sPkg.pipe(dPkg);
    let shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    let sScr = api.fs.createReadStream(current + '/' + shellScript);
    let dScr = api.fs.createWriteStream(destination + '/' + shellScript);
    sScr.pipe(dScr);
    api.ncp(
      current + '/config',
      destination + '/config',
      { clobber: false },
      (err) => {
        if (err) console.error(err);
        api.ncp(
          current + '/applications',
          destination + '/applications',
          { clobber: false },
          (err) => {
            if (err) {
              console.error(err);
            } else if (!isWin) {
              execute('chmod +x ' + destination + '/server.sh', installCLI);
            } else installCLI();
          }
        );
      }
    );
  }
}
