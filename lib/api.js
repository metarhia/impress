'use strict';

global.api = {};

// Global
//
api.console = console;
api.require = require;

// Node.js internal modules
//
api.os = require('os');
api.vm = require('vm');
api.domain = require('domain');
api.crypto = require('crypto');
api.tls = require('tls');
api.net = require('net');
api.http = require('http');
api.https = require('https');
api.dns = require('dns');
api.dgram = require('dgram');
api.url = require('url');
api.path = require('path');
api.punycode = require('punycode');
api.fs = require('fs');
api.util = require('util');
api.events = require('events');
api.cluster = require('cluster');
api.querystring = require('querystring');
api.readline = require('readline');
api.stream = require('stream');
api.zlib = require('zlib');
api.childProcess = require('child_process');
api.exec = api.childProcess.exec;
api.stringDecoder = require('string_decoder').StringDecoder;

// External modules
//
api.async = require('async');
api.mkdirp = require('mkdirp');
api.colors = require('colors');
api.multiparty = require('multiparty');
api.iconv = require('iconv-lite');
api.csv = require('csv');
api.zipStream = require('zip-stream');
