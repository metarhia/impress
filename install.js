'use strict';

const fs = require('fs');
const cp = require('child_process');
const ncp = require('ncp').ncp;
const path = require('path');
const metasync = require('metasync');
const concolor = require('concolor');

const isWin = !!process.platform.match(/^win/);

ncp.limit = 16;

const current = path.dirname(__filename.replace(/\\/g, '/'));
const parent = path.basename(path.dirname(current));
const destination = path.dirname(path.dirname(current));
let exists = false;

const jstpPath = path.dirname(require.resolve('metarhia-jstp'));
const jstpDistPath = path.join(jstpPath, 'dist');
const staticDir = path.resolve(__dirname, 'applications/example/static/js');

// Execute shell command displaying output and possible errors
//
const execute = (cmd, callback) => {
  cp.exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(error.toString());
      console.error(stderr);
    } else {
      console.log(stdout);
    }
    if (callback) callback();
  });
};

// Install CLI
//
const installCLI = () => {
  execute('npm install --unsafe-perm impress-cli -g', () => {
    execute('impress path ' + destination);
  });
};

const done = () => {
  const em = concolor('b,green');
  if (exists) {
    console.log(
      em('Impress Application Server') +
      ' is already installed and configured in this folder.'
    );
  } else {
    console.log(
      concolor('b')('Installing Impress Application Server...')
    );
    const sSrv = fs.createReadStream(current + '/server.js');
    const dSrv = fs.createWriteStream(destination + '/server.js');
    sSrv.pipe(dSrv);
    const sPkg = fs.createReadStream(current + '/lib/package.template');
    const dPkg = fs.createWriteStream(destination + '/package.json');
    sPkg.pipe(dPkg);
    const shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    const sScr = fs.createReadStream(current + '/' + shellScript);
    const dScr = fs.createWriteStream(destination + '/' + shellScript);
    sScr.pipe(dScr);
    ncp(
      current + '/config',
      destination + '/config',
      { clobber: false },
      (err) => {
        if (err) console.error(err);
        ncp(
          current + '/applications',
          destination + '/applications',
          { clobber: false },
          (err) => {
            if (err) {
              console.error(err);
              return;
            }
            if (isWin) {
              installCLI();
              return;
            }
            execute('chmod +x ' + destination + '/server.sh', installCLI);
          }
        );
      }
    );
  }
};

// Install Impress Application Server
//
const installImpress = () => {
  if (parent !== 'node_modules') {
    console.log('Running in developer mode');
    process.exit(0);
  }

  const checkFiles = ['package.json', 'server.js', 'config', 'applications'];

  const check = (file, callback) => {
    fs.access(destination + '/' + file, (err) => {
      exists = exists || !err;
      callback();
    });
  };

  metasync.each(checkFiles, check, done);
};

// Symlink the browser version of JSTP
//
metasync.each(['jstp.min.js', 'jstp.min.js.map'], (file, callback) => {
  const source = path.join(jstpDistPath, file);
  const dest = path.join(staticDir, file);

  fs.unlink(dest, () => {  // Errors are ignored intentionally
    fs.symlink(source, dest, (err) => {
      if (err) throw err;
      callback();
    });
  });
}, installImpress);
