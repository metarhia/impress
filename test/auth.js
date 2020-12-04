'use strict';

const metatests = require('metatests');
const { Auth } = require('../lib/auth.js');

const config = {
  characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  secret: 'secret', // Session secret
  length: 64, // SID length in bytes
};

metatests.test('lib/auth.Auth', test => {
  const auth = new Auth(config);
  test.strictSame(typeof auth, 'object');
  test.strictSame(auth.constructor.name, 'Auth');
  test.strictSame(auth.characters.length, 62);
  test.strictSame(auth.secret.length, 6);
  test.strictSame(auth.length, 64);
  test.strictSame(auth.db, null);
  test.end();
});
