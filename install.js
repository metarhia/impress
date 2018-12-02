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
    const sSrv = fs.createReadStream(api.path.join(current, 'server.js'));
    const dSrv = fs.createWriteStream(api.path.join(destination, 'server.js'));
    sSrv.pipe(dSrv);
    const spPath = api.path.join(current, 'lib/package.template');
    const sPkg = fs.createReadStream(spPath);
    const dpPath = api.path.join(destination, 'package.json');
    const dPkg = fs.createWriteStream(dpPath);
    sPkg.pipe(dPkg);
    const shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
    const sScr = fs.createReadStream(api.path.join(current, shellScript));
    const dScr = fs.createWriteStream(api.path.join(destination, shellScript));
    sScr.pipe(dScr);
    ncp(
      api.path.join(current, 'config'),
      api.path.join(destination, 'config'),
      { clobber: false },
      err => {
        if (err) console.error(err);
        ncp(
          api.path.join(current, 'applications'),
          api.path.join(destination, 'applications'),
          { clobber: false },
          err => {
            if (err) {
              console.error(err);
              return;
            }
            if (isWin) {
              installCLI();
              return;
            }
            const serverPath = api.path.join(destination, 'server.sh');
            execute('chmod +x ' + serverPath, installCLI);
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
    fs.access(api.path.join(destination, file), err => {
      exists = exists || !err;
      callback();
    });
  };

  metasync.each(checkFiles, check, done);
};

installImpress();
