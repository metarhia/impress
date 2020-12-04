'use strict';

const metatests = require('metatests');
const security = require('../lib/security.js');

metatests.test('lib/security.hashPassword', async test => {
  const password = 'password';
  const hash = await security.hashPassword(password);
  test.strictSame(typeof hash, 'string');
  test.strictSame(hash.length, 170);
  test.end();
});

metatests.test('lib/security.validatePassword', async test => {
  const password = 'password';
  const hash = await security.hashPassword(password);
  const valid = await security.validatePassword(password, hash);
  test.strictSame(valid, true);
  test.end();
});
