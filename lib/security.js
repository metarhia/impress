'use strict';

const { crypto } = require('./dependencies.js');

const serializeHash = (hash, salt, params) => {
  const paramString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`).join(',');
  const saltString = salt.toString('base64').split('=')[0];
  const hashString = hash.toString('base64').split('=')[0];
  return `$scrypt$${paramString}$${saltString}$${hashString}`;
};

const deserializeHash = phcString => {
  const parsed = phcString.split('$');
  parsed.shift();
  if (parsed[0] !== 'scrypt') {
    throw new Error('Node.js crypto module only supports scrypt');
  }
  const params = Object.fromEntries(
    parsed[1].split(',').map(p => {
      const kv = p.split('=');
      kv[1] = Number(kv[1]);
      return kv;
    })
  );
  const salt = Buffer.from(parsed[2], 'base64');
  const hash = Buffer.from(parsed[3], 'base64');
  return { params, salt, hash };
};

const SALT_LEN = 32;
const KEY_LEN = 64;

// Only change these if you know what you're doing
const SCRYPT_PARAMS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const hashPassword = password => new Promise((resolve, reject) => {
  crypto.randomBytes(SALT_LEN, (err, salt) => {
    if (err) {
      reject(err);
      return;
    }
    crypto.scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, (err, hash) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(serializeHash(hash, salt, SCRYPT_PARAMS));
    });
  });
});

let defaultHash;
hashPassword('').then(hash => {
  defaultHash = hash;
});

const validatePassword = (password, hash = defaultHash) =>
  new Promise((resolve, reject) => {
    const parsedHash = deserializeHash(hash);
    const len = parsedHash.hash.length;
    crypto.scrypt(password, parsedHash.salt, len, parsedHash.params,
      (err, hashedPassword) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(crypto.timingSafeEqual(hashedPassword, parsedHash.hash));
      }
    );
  });

module.exports = Object.freeze({ hashPassword, validatePassword });
