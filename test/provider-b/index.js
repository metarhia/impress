'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARK = 'provider-b-executed';

if (require.main !== module) {
  const mark = path.join(process.cwd(), MARK);
  fs.writeFileSync(mark, 'fixture-provider-b\n');
}

const start = () => {
  const connection = () => undefined;
  const datagram = () => undefined;
  const stop = () => undefined;
  return { connection, datagram, stop };
};

module.exports = { start };
