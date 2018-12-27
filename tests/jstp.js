'use strict'

const fs = require('fs');
const path = require('path');
const metatests = require('metatests');

const loadTests = dir => {
  metatests.runner.instance.wait();
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error(err);
      impress.shutdown(1);
    } else {
      files.map(file => path.join(dir, file))
      .forEach(file => {
        if (fs.statSync(file).isDirectory()) {
          loadTests(file);
        } else if (path.extname(file) === '.js') {
          require(file);
        }
      });
    }
    metatests.runner.instance.resume();
  });
};

loadTests(path.join(__dirname, 'example'));
