'use strict';

const fs = require('fs');
const dev = fs.existsSync('impress.js');
const impress = require(dev ? '.' : 'impress');
impress.start();
