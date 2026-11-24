'use strict';

const fs = require('node:fs');
const path = require('node:path');

const toSection = (value) => `(${JSON.stringify(value, null, 2)});\n`;

const readFixture = (name) => {
  const file = path.join(__dirname, 'fixtures', name);
  return fs.readFileSync(file, 'utf8');
};

module.exports = { toSection, readFixture };
