'use strict';

var fs = require('fs');

fs.exists('./tests', function(fileExists) {
  if (fileExists) require('./lib/impress');
  else require('impress');
  //api.impress.logApiMethod('fs.readdir');
  before();
  console.log('---');
  for (var i = 0; i < 1000; i++) runit();
  after();
  impress.server.start();
});

var fNames = [
  'falseness',
  'trueness',
  'emptyness',
  'safeFunc',
  'generateSID',
  'crcSID',
  'validateSID',
  'subst',
  'getByPath',
  'setByPath',
  'deleteByPath',
  'htmlEscape',
  'fileExt',
  'isTimeEqual',
  'parseHost',
  'removeBOM',
  'arrayRegExp',
  'pad2',
  'nowDate',
  'nowDateTime',
  'sortCompareConfig',
  'sortCompareDirectories',
  'sortCompareByName',
  'clearCacheStartingWith',
  'spinalToCamel',
  'duration',
  'generateKey',
  'generateGUID',
  'ip2int',
  'escapeRegExp',
  'addTrailingSlash',
  'stripTrailingSlash',
  'dirname',
  'bytesToSize',
  'sizeToBytes',
  'random',
  'shuffle',
  'extend',
  'clone',
  'trim',
  'ltrim',
  'rtrim',
  'capitalize',
  'lpad',
  'rpad',
  'between',
  'isScalar',
  'inArray',
  'merge',
  'override',
  'startsWith',
  'endsWith',
  'contains'
];

function before() {
  var cnt = 0;
  fNames.map(function(fName) {
    var fn = api.impress[fName];
    api.v8.optimizeFunctionOnNextCall(fn);
    var status = api.v8.getOptimizationToString(fn);
    if (status !== 'optimized') {
      console.log(fName + ' - ' + status);
      cnt++;
    }
  });
  console.log('count: ' + cnt);
}

function after() {
  var cnt = 0;
  fNames.map(function(fName) {
    var fn = api.impress[fName];
    var status = api.v8.getOptimizationToString(fn);
    if (status !== 'optimized') {
      console.log(fName + ' - ' + status);
      cnt++;
    }
  });
  console.log('count: ' + cnt);
}

var config = {
  sessions: {
    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    secret:     'secret',
    length:     64
  }
};

function runit() {
  api.impress.falseness();
  api.impress.trueness();
  api.impress.emptyness();
  api.impress.safeFunc(function() {});
  api.impress.generateSID(config);
  api.impress.crcSID(config, 'key');
  api.impress.validateSID(config, 'sid');
  api.impress.subst('tpl', {}, 'a', true);
  api.impress.getByPath({a:{b:1}}, 'a.b');
  api.impress.setByPath({a:{b:1}}, 'a.b', 1);
  api.impress.deleteByPath({a:{b:1}}, 'a.b');
  api.impress.htmlEscape('<br>');
  api.impress.fileExt('file.ext');
  api.impress.isTimeEqual(new Date(), new Date());
  api.impress.parseHost('host:80');
  api.impress.removeBOM('noBOM');
  api.impress.arrayRegExp(['/css/*', '/index.html']);
  api.impress.pad2(10);
  api.impress.nowDate();
  api.impress.nowDateTime();
  api.impress.sortCompareConfig('uno', 'due');
  api.impress.sortCompareDirectories({name:'uno'},{name:'due'});
  api.impress.sortCompareByName('uno', 'due');
  api.impress.clearCacheStartingWith({abc:1}, 'a');
  api.impress.spinalToCamel('str_name');
  api.impress.duration('1d 10h 7m 13s');
  api.impress.generateKey(5, 'possible');
  api.impress.generateGUID();
  api.impress.ip2int('10.0.0.1');
  api.impress.escapeRegExp('str');
  api.impress.addTrailingSlash('str');
  api.impress.stripTrailingSlash('str');
  api.impress.dirname('str');
  api.impress.bytesToSize(100000);
  api.impress.sizeToBytes('10Mb');
  api.impress.random(5, 50);
  api.impress.shuffle([1,2,3]);
  api.impress.extend({a:1}, {b:2});
  api.impress.clone({a:1}, {b:2});
  api.impress.trim(' str ');
  api.impress.ltrim(' str ');
  api.impress.rtrim(' str ');
  api.impress.capitalize(' str ');
  api.impress.lpad(' str ', '-', 10);
  api.impress.rpad(' str ', '-', 10);
  api.impress.between('hello[123]world', '[', ']');
  api.impress.isScalar('a');
  api.impress.inArray([1,2,3], 2);
  api.impress.merge([1,2,3],[4,5]);
  api.impress.override({}, function() {});
  api.impress.startsWith('str', 'substring');
  api.impress.endsWith('str', 'substring');
  api.impress.contains('str', 'substring');
}
