import { LogConfig, ScaleConfig, ServerConfig, SessionsConfig } from './config';
import { Application, Context, Client } from './core';

import * as _util from 'util';
import * as _cp from 'child_process';
import * as _os from 'os';
import * as _v8 from 'v8';
import * as _vm from 'vm';
import * as _path from 'path';
import * as _url from 'url';
import * as _sd from 'string_decoder';
import * as _qs from 'querystring';
import * as _querystring from 'querystring';
import * as _assert from 'assert';
import * as _stream from 'stream';
import * as _fs from 'fs';
import * as _crypto from 'crypto';
import * as _zlib from 'zlib';
import * as _readline from 'readline';
import * as _ph from 'perf_hooks';
import * as _ah from 'async_hooks';
import * as _timers from 'timers';
import * as _events from 'events';
import * as _dns from 'dns';
import * as _net from 'net';
import * as _tls from 'tls';
import * as _http from 'http';
import * as _https from 'https';
import * as _http2 from 'http2';
import * as _dgram from 'dgram';

import * as _ws from 'ws';

import * as _config from 'metaconfiguration';
import * as _metautil from 'metautil';
import * as _metavm from 'metavm';
import * as _metacom from 'metacom';
import * as _metalog from 'metalog';
import * as _metawatch from 'metawatch';
import * as _metaschema from 'metaschema';

declare global {
  const application: Application;
  const context: Context;

  namespace config {
    const log: LogConfig;
    const scale: ScaleConfig;
    const server: ServerConfig;
    const sessions: SessionsConfig;
  }

  namespace metarhia {
    const config: typeof _config;
    const metautil: typeof _metautil;
    const metavm: typeof _metavm;
    const metacom: typeof _metacom;
    const metalog: typeof _metalog;
    const metawatch: typeof _metawatch;
    const metaschema: typeof _metaschema;
  }

  namespace node {
    const util: typeof _util;
    const child_process: typeof _cp;
    const childProcess: typeof _cp;
    const os: typeof _os;
    const v8: typeof _v8;
    const vm: typeof _vm;
    const path: typeof _path;
    const url: typeof _url;
    const StringDecoder: typeof _sd;
    const querystring: typeof _qs;
    const assert: typeof _assert;
    const stream: typeof _stream;
    const fs: typeof _fs;
    const fsp: typeof _fs.promises;
    const crypto: typeof _crypto;
    const zlib: typeof _zlib;
    const readline: typeof _readline;
    const perf_hooks: typeof _ph;
    const perfHooks: typeof _ph;
    const async_hooks: typeof _ah;
    const asyncHooks: typeof _ah;
    const timers: typeof _timers;
    const events: typeof _events;
    const dns: typeof _dns;
    const net: typeof _net;
    const tls: typeof _tls;
    const http: typeof _http;
    const https: typeof _https;
    const http2: typeof _http2;
    const dgram: typeof _dgram;
  }

  namespace npm {
    const ws: typeof _ws;
  }
}
