'use strict';

var config = {
  sessions: {
    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    secret:     'secret',
    length:     64
  }
};

var methodConteiner = {};
methodConteiner.method = function(obj) {
  obj.field = 'value';
  return obj;
};

api.test.case({
  'api.impress.localIPs': [
    [ [], function(value) { return Array.isArray(value); } ],
  ],
  'api.impress.generateSID': [
    [ config, function(result) { return result.length === 64; } ],
  ],
  'api.impress.crcSID': [
    [ config, api.common.generateKey(config.sessions.length - 4, config.sessions.characters), function(result) {
      return result.length === 4;
    } ]
  ],
  'api.impress.validateSID': [
    [ config, 'ag0DEZqImmOPOQxl1DCIJh5KvSr4OX6wE2tDoVybqNrs1jLhimN7zV6mCPyl5b96', true  ],
    [ config, 'ag0DEZqImmOfOQxl1DCIJh5KvSr4OX6wE2tDoVybqNrs1jLhimN7zV6mCPyl5b96', false ],
    [ config, '2XpU8oAewXwKJJSQeY0MByY403AyXprFdhB96zPFbpJxlBqHA3GfBYeLxgHxBhhZ', false ],
    [ config, 'WRONG-STRING', false ],
    [ config, '',             false ],
  ],
  'api.impress.parseHost': [
    [ '',                'no-host-name-in-http-headers' ],
    [ 'domain.com',      'domain.com' ],
    [ 'localhost',       'localhost'  ],
    [ 'domain.com:8080', 'domain.com' ],
  ],
  'api.impress.removeBOM': [
    [ '\uBBBF\uFEFFabc', 'abc' ],
    [ '\uBBBF\uFEFF',    ''    ],
    [ '\uFEFFabc',       'abc' ],
    [ '\uBBBFabc',       'abc' ],
    [ '\uFEFF',          ''    ],
    [ '\uBBBF',          ''    ],
    [ 'abc',             'abc' ],
  ],
  'api.impress.arrayRegExp': [
    [ ['*'],                 '^.*$' ],
    [ ['/css/*','/folder*'], '^((\\/css\\/.*)|(\\/folder.*))$' ],
    [ ['/','/js/*'],         '^((\\/)|(\\/js\\/.*))$' ],
    [ ['/css/*.css'],        '^\\/css\\/.*\\.css$' ],
    [ ['*/css/*'],           '^.*\\/css\\/.*$' ],
  ],
  'api.impress.sortCompareConfig': [
    [ 'files.js', 'sandbox.js',       1 ],
    [ 'filestorage.js', 'routes.js', -1 ],
    [ 'unknown.js', 'sandbox.js',     1 ],
    [ 'log.js', 'sandbox.js',         1 ],
    [ 'sandbox.js', 'sandbox.js',     0 ],
    [ 'log.js', 'log.js',             0 ],
    [ 'tasks.js', 'application.js',  -1 ],
  ],
  'api.impress.sortCompareDirectories': [
    [ { name: '/abc' },     { name: 'abc.ext' },  -1 ],
    [ { name: 'ABC.ext' },  { name: '/abc' },      1 ],
    [ { name: 'abc' },      { name: 'ABC.ext' },   1 ],
    [ { name: '/ABC' },     { name: '/abc.ext' }, -1 ],
    [ { name: '/abc.ext' }, { name: '/ABC' },      1 ],
    [ { name: '/abc.ext' }, { name: '/ABC' },      1 ],
    [ { name: '/ABC' },     { name: '/ABC' },      0 ],
    [ { name: 'abc.ext' },  { name: 'abc.ext' },   0 ],
    [ { name: 'abc.ext' },  { name: 'def.ext' },  -1 ],
    [ { name: 'def.ext' },  { name: 'abc.ext' },   1 ],
  ],
  'api.impress.sortCompareByName': [
    [ { name: 'abc' }, { name: 'def' },  -1 ],
    [ { name: 'def' }, { name: 'abc' },   1 ],
    [ { name: 'abc' }, { name: 'abc' },   0 ],
    [ { name: 'def' }, { name: 'def' },   0 ],
    [ { name: 'abc' }, { name: 'a' },     1 ],
    [ { name: 'a' },   { name: 'abc' },  -1 ],
    [ { name: '123' }, { name: 'name' }, -1 ],
  ],
  'api.impress.clearCacheStartingWith': [
    [ { abc: '123', abcd: '1234', abcde: '12345' }, 'abcd',               { abc: '123' } ],
    [ { abc: '123', abcd: '1234', abcde: '12345' }, 'a',                             { } ],
    [ { abc: '123', abcd: '1234' }, 'qwer',                 { abc: '123', abcd: '1234' } ],
    [ { abc: '123', abcd: '1234' }, 'abc',                                           { } ],
  ],
  'api.net.isIP': [
    [ '127.0.0.1',         4 ],
    [ '10.0.0.1',          4 ],
    [ '192.168.1.10',      4 ],
    [ 'domain.com',        0 ],
    [ '127.0.0.com',       0 ],
    [ '',                  0 ],
  ],
  'api.impress.logApiMethod': [
    [ 'fs.stats', undefined ]
  ]
});
