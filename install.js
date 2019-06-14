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

const writeFiles = (callback) => {
  console.log(
    concolor('b')('Installing Impress Application Server...')
  );
  const sSrv = fs.createReadStream(path.join(current, 'server.js'));
  const dSrv = fs.createWriteStream(path.join(destination, 'server.js'));
  sSrv.pipe(dSrv);
  const shellScript = 'server.' + (isWin ? 'cmd' : 'sh');
  const sScr = fs.createReadStream(path.join(current, shellScript));
  const dScr = fs.createWriteStream(path.join(destination, shellScript));
  sScr.pipe(dScr);

  metasync.each(['config', 'applications'], (folder, cb) => {
    ncp(
      path.join(current, folder),
      path.join(destination, folder),
      { clobber: false },
      err => {
        if (err) console.error(err);
        cb(err);
      }
    );
  }, err => {
    if (err || isWin) {
      callback(err);
    } else {
      const serverPath = path.join(destination, 'server.sh');
      execute('chmod +x ' + serverPath, callback);
    }
  });
};

// Install Impress Application Server
//
const installImpress = () => {
  if (parent !== 'node_modules') {
    console.log('Running in developer mode');
    process.exit(0);
  }

  const checkFiles = ['server.js', 'config', 'applications'];

  let exists = false;
  const check = (file, callback) => {
    fs.access(path.join(destination, file), err => {
      exists = exists || !err;
      callback();
    });
  };

  metasync.each(checkFiles, check, () => {
    if (exists) {
      const em = concolor('b,green');
      console.log(
        em('Impress Application Server') +
        ' is already installed and configured in this folder.'
      );
    } else {
      writeFiles(err => {
        if (!err) installCLI();
      });
    }
  });
};

installImpress();
