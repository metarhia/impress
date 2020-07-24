[![impress logo](http://habrastorage.org/files/d67/1b3/be5/d671b3be591d47a9bd10fe857e9d5319.png)](https://github.com/metarhia/impress)

[![travis](https://travis-ci.org/metarhia/impress.svg?branch=master)](https://travis-ci.org/metarhia/impress)
[![codacy](https://api.codacy.com/project/badge/Grade/6fb7b607a9cb445984aebbc08fdeb13c)](https://www.codacy.com/app/metarhia/impress)
[![npm version](https://img.shields.io/npm/v/impress.svg?style=flat)](https://www.npmjs.com/package/impress)
[![npm downloads/month](https://img.shields.io/npm/dm/impress.svg)](https://www.npmjs.com/package/impress)
[![npm downloads](https://img.shields.io/npm/dt/impress.svg)](https://www.npmjs.com/package/impress)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/web-locks/blob/master/LICENSE)

[Impress](https://github.com/metarhia/impress) Application Server for
[node.js](http://nodejs.org). All decisions are made. Solutions are scaled and
optimized for performance and load.

Metarhia and Impress Application Server way:
- Applied code need to be simple and secure, so we use code sandboxing with v8
isolated contexts and worker threads;
- Domain code need to be separated from system code; so we use layered
architecture and contract-based approach;
- Impress supports both stateful applications with RPC and client-session
sticky to servers;
- No I/O is faster even then async I/O, so we hold state in memory and use
lazy I/O for persistent storage;

## Features

- Auto API routing, just create endpoint files as an async js lambda function;
- API code live reload with file system watch (when files changes on disk);
- Graceful shutdown and application state recovery after reload;
- Minimum code size and dependencies;
- Can scale on multiple threads and servers;
- Code sandboxing for security, dependency injection and context isolation;
- Utilize multiple CPU cores and serve multiple ports with worker threads;
- Inter-process communication and shared memory used for state management;
- State synchronization mechanism with transactions and subscription;
- Cache server-side executable JavaScript in memory;
- API development support: AJAX RPC and Websocket support;
- Serve static files from memory cache;
- Application configuration (for different named environments);
- Database access layer for PostgreSQL and Relational db schemas;
- Persistent sessions support with authentication, groups and anonymous;
- Multiple protocols: HTTP, HTTPS, WS, WSS;
- Logging with buffering (lazy write) and rotation (keep logs N days);
- File utilities: upload, download, streaming;
- Built-in simple testing framework;
- Server health monitoring;
- Built-in data structures validation and preprocessing library;
- Task scheduling (interval or certain time);
- Request queue with timeout and size;
- Execution timeout and error handling;

## Installation and upgrade

- Install with `npm install impress`
- or use [Metarhia Starter Kit](https://github.com/metarhia/StarterKit)

## Requirements

- Node.js v12.9.0 or later (v14 preferred)
- Linux (tested on Fedora 30, Ubuntu 16, 18, 19 and 20, CentOS 7 and 8)
- Postgresql 9.5 or later (v11.8 preferred)
- OpenSSL v1.1.1 or later
- [certbot](https://github.com/certbot/certbot) (recommended but optional)

## Contributors

- Timur Shemsedinov (marcusaurelius)
- See github for full [contributors list](https://github.com/metarhia/impress/graphs/contributors)

## License

Copyright (c) 2020 Metarhia contributors.
Impress Application Server is [MIT licensed](./LICENSE).
Project coordinator: &lt;timur.shemsedinov@gmail.com&gt;
