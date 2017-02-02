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

const current = api.path.dirname(__filename.replace(/\\/g, '/'));
const parent = api.path.basename(api.path.dirname(current));
const destination = api.path.dirname(api.path.dirname(current));
let exists = false;

const jstpPath = api.path.dirname(require.resolve('metarhia-jstp'));
const jstpDistPath = api.path.join(jstpPath, 'dist');
const staticDir = api.path.resolve(__dirname, 'applications/example/static/js');

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
  const source = api.path.join(jstpDistPath, file);
  const dest = api.path.join(staticDir, file);

  const data = api.fs.readFileSync(source);
  api.fs.writeFileSync(dest, data);
});

if (parent !== 'node_modules') {
  console.log('Running in developer mode');
  process.exit(0);
}

const checkFiles = ['package.json', 'server.js', 'config', 'applications'];
api.metasync.each(checkFiles, check, done);

function check(file, callback) {
  api.fs.access(destination + '/' + file, (err) => {
    exists = exists || !err;
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
    const sSrv = api.fs.createReadStream(
      current + '/server.js'
    );
    const dSrv = api.fs.createWriteStream(
      destination + '/server.js'
    );
    sSrv.pipe(dSrv);
    const sPkg = api.fs.createReadStream(
      current + '/lib/package.template.json'
    );
    const dPkg = api.fs.createWriteStream(
      destination + '/package.json'
    );
    sPkg.pipe(dPkg);
    const shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    const sScr = api.fs.createReadStream(
      current + '/' + shellScript
    );
    const dScr = api.fs.createWriteStream(
      destination + '/' + shellScript
    );
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
            if (err) return console.error(err);
            if (isWin) return installCLI();
            execute('chmod +x ' + destination + '/server.sh', installCLI);
          }
        );
      }
    );
  }
}
