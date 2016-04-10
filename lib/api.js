'use strict';

// Global API namespace for Impress Application Server
//
global.api = {};

// Global javascript names
//
api.console = console;
api.require = require;

// Node.js core modules
//
api.os = require('os');
api.vm = require('vm');
api.fs = require('fs');
api.tls = require('tls');
api.net = require('net');
api.dns = require('dns');
api.url = require('url');
api.util = require('util');
api.path = require('path');
api.zlib = require('zlib');
api.http = require('http');
api.https = require('https');
api.dgram = require('dgram');
api.stream = require('stream');
api.buffer = require('buffer'); global.SlowBuffer = api.buffer.SlowBuffer;
api.domain = require('domain');
api.crypto = require('crypto');
api.events = require('events');
api.cluster = require('cluster');
api.punycode = require('punycode');
api.readline = require('readline');
api.querystring = require('querystring');
api.childProcess = require('child_process');
api.stringDecoder = require('string_decoder');

api.exec = api.childProcess.exec;

// External api modules
//
api.csv = require('csv');
api.iconv = require('iconv-lite');
api.async = require('async');
api.mkdirp = require('mkdirp');
api.colors = require('colors');
api.zipStream = require('zip-stream');
api.multiparty = require('multiparty');

// Impress api modules
//
if (process.execArgv.indexOf('--allow-natives-syntax') >= 0) require('./api.v8');
require('./api.con');
require('./api.common');
require('./api.impress');
require('./api.registry');
require('./api.definition');
