"use strict";

var config = {
  sessions: {
    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    secret:     'secret',
    length:     64
  }
};

impress.test({
  'impress.localIPs': [
    [ [], function(value) {
      return Array.isArray(value);
    } ]
  ],
  'impress.generateSID': [
    [ config, function(result) {
      return result.length === 64;
    } ]
  ],
  'impress.crcSID': [
    [ config, generateKey(config.sessions.length-4, config.sessions.characters), function(result) {
      return result.length === 4;
    } ]
  ],
  'impress.validateSID': [
    [ config, 'ag0DEZqImmOPOQxl1DCIJh5KvSr4OX6wE2tDoVybqNrs1jLhimN7zV6mCPyl5b96', true ],
    [ config, 'ag0DEZqImmOfOQxl1DCIJh5KvSr4OX6wE2tDoVybqNrs1jLhimN7zV6mCPyl5b96', false ],
    [ config, '2XpU8oAewXwKJJSQeY0MByY403AyXprFdhB96zPFbpJxlBqHA3GfBYeLxgHxBhhZ', false ],
    [ config, 'WRONG-STRING', false ],
    [ config, '', false ]
  ],
  'impress.subst': [
    [ 'Hello, @name@', { name:'Ali' }, '', true, 'Hello, Ali' ],
    [ 'Hello, @.name@', { person: { name:'Ali' } }, 'person', true, 'Hello, Ali' ]
  ],
  'impress.dataByPath': [
    [ { item: { subitem: { value: 'Gagarin' } } }, 'item.subitem.value', 'Gagarin' ],
    [ { item: { subitem: { value: 123       } } }, 'item.subitem.value',       123 ],
    [ { item: { subitem: { value: true      } } }, 'item.subitem.value',      true ],
    [ { item: { subitem: { value: false     } } }, 'item.subitem.value',     false ],
    [ { item: { subitem: { value: 'Gagarin' } } }, 'item.subitem.none',  undefined ],
    [ { item: { subitem: { value: null      } } }, 'item.subitem.value',      null ],
    [ { item: { subitem: { value: 'Gagarin' } } }, 'item.none.value',    undefined ],
    [ { item: { subitem: { value: 'Gagarin' } } }, 'item.subitem', function(result) { return JSON.stringify(result) === '{"value":"Gagarin"}' } ]
  ],
  'impress.htmlEscape': [
    [ 'text', 'text' ],
    [ '<tag>', '&lt;tag&gt;' ],
    [ 'You &amp; Me', 'You &amp;amp; Me' ],
    [ 'You & Me', 'You &amp; Me' ],
    [ '"Quotation"', '&quot;Quotation&quot;' ]
  ],
  'impress.fileExt': [
    [ '/dir/dir/file.txt', 'txt' ],
    [ '/dir/dir/file.txt', 'txt' ],
    [ '\\dir\\file.txt',   'txt' ],
    [ '/dir/dir/file.txt', 'txt' ],
    [ '/dir/file.txt',     'txt' ],
    [ '/dir/file.TXt',     'txt' ],
    [ '//file.txt',        'txt' ],
    [ 'file.txt',          'txt' ],
    [ '/dir.ext/',         'ext' ],
    [ '/dir/',             ''    ],
    [ '/',                 ''    ],
    [ '.',                 ''    ],
    [ '',                  ''    ]
  ],
  'impress.isTimeEqual': [
    [ '2014-01-01', '2014-01-01', true]
  ],
  'impress.parseHost': [
    [ '',                'no-host-name-in-http-headers' ],
    [ 'domain.com',      'domain.com' ],
    [ 'localhost',       'localhost' ],
    [ 'domain.com:8080', 'domain.com' ]
  ],
  'impress.arrayRegExp': [
    [ ['*'],                 '^.*$' ],
    [ ['/css/*','/folder*'], '^((\\/css\\/.*)|(\\/folder.*))$' ],
    [ ['/','/js/*'],         '^((\\/)|(\\/js\\/.*))$' ],
    [ ['/css/*.css'],        '^\\/css\\/.*\\.css$' ],
    [ ['*/css/*'],           '^.*\\/css\\/.*$' ]
  ],
  'impress.sortCompareConfig': [
    [ 'files.js', 'sandbox.js',       1 ],
    [ 'filestorage.js', 'routes.js', -1 ],
    [ 'unknown.js', 'sandbox.js',     1 ],
    [ 'log.js', 'sandbox.js',         1 ],
    [ 'sandbox.js', 'sandbox.js',     0 ],
    [ 'log.js', 'log.js',             0 ],
    [ 'tasks.js', 'application.js',  -1 ]
  ],
  'impress.sortCompareDirectories': [
    [ { name: '/abc' },     { name: 'abc.ext' },  -1 ],
    [ { name: 'ABC.ext' },  { name: '/abc' },      1 ],
    [ { name: 'abc' },      { name: 'ABC.ext' },   1 ],
    [ { name: '/ABC' },     { name: '/abc.ext' }, -1 ],
    [ { name: '/abc.ext' }, { name: '/ABC' },      1 ],
    [ { name: '/abc.ext' }, { name: '/ABC' },      1 ],
    [ { name: '/ABC' },     { name: '/ABC' },      0 ],
    [ { name: 'abc.ext' },  { name: 'abc.ext' },   0 ],
    [ { name: 'abc.ext' },  { name: 'def.ext' },  -1 ],
    [ { name: 'def.ext' },  { name: 'abc.ext' },   1 ]
  ],
  'impress.sortCompareByName': [
    [ { name: 'abc' }, { name: 'def' },  -1 ],
    [ { name: 'def' }, { name: 'abc' },   1 ],
    [ { name: 'abc' }, { name: 'abc' },   0 ],
    [ { name: 'def' }, { name: 'def' },   0 ],
    [ { name: 'abc' }, { name: 'a' },     1 ],
    [ { name: 'a' },   { name: 'abc' },  -1 ],
    [ { name: '123' }, { name: 'name' }, -1 ]
  ]
});
