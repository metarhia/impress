[![impress logo](http://habrastorage.org/files/d67/1b3/be5/d671b3be591d47a9bd10fe857e9d5319.png)](https://github.com/metarhia/impress)

[![ci Status](https://github.com/metarhia/impress/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/impress/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![codacy](https://api.codacy.com/project/badge/Grade/6fb7b607a9cb445984aebbc08fdeb13c)](https://www.codacy.com/app/metarhia/impress)
[![snyk](https://snyk.io/test/github/metarhia/impress/badge.svg)](https://snyk.io/test/github/metarhia/impress)
[![npm version](https://img.shields.io/npm/v/impress.svg?style=flat)](https://www.npmjs.com/package/impress)
[![npm downloads/month](https://img.shields.io/npm/dm/impress.svg)](https://www.npmjs.com/package/impress)
[![npm downloads](https://img.shields.io/npm/dt/impress.svg)](https://www.npmjs.com/package/impress)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/impress/blob/master/LICENSE)

[Impress](https://github.com/metarhia/impress) application server for
[node.js](http://nodejs.org). All decisions are made and optimized for security,
performance, high-intensive network operations, scalability, interactivity, rapid
development practices, and clean project structure.

## Quick start

- Install with `npm install impress` or copy project template from
  [metarhia/Example](https://github.com/metarhia/Example)
- Start server with `node server.js` or select execution mode (test, dev, prod)
  use `MODE=dev node server.js`
- See [documentation and specifications](https://github.com/metarhia/Contracts)
  and project home page: https://metarhia.com

### Metarhia and Impress application server way

- Applied code needs to be simple and secure, so we use code sandboxing with v8
  isolated contexts, worker threads and minimal trusted npm dependencies;
- Domain code needs to be separated from system code; so we use DDE, layered
  (onion) architecture, DI, SOLID, DIP principle and contract-based approach;
- Impress supports both stateful applications with RPC and client-session
  sticky to servers; microservices, centralized and distributed architecture;
- No I/O is faster even than async I/O, so we hold state in memory and use
  lazy I/O for persistent storage;

## Features

- Auto API routing, just create endpoint files as an async js lambda function;
- API code live reload with file system watch (when files change on disk);
- Graceful shutdown and application state recovery after reload;
- Minimum code size and dependencies;
- Can scale on multiple threads and servers;
- Code sandboxing for security, dependency injection, and context isolation;
- Utilize multiple CPU cores and serve multiple ports with worker threads;
- Inter-process communication and shared memory used for state management;
- State synchronization mechanism with transactions and subscription;
- Cache server-side executable JavaScript in memory;
- API development support: AJAX RPC and Websocket support;
- Serve static files from memory cache;
- Application configuration (for different named environments);
- Database access layer for PostgreSQL and Relational db schemas;
- Persistent sessions support with authentication, groups, and anonymous;
- Multiple protocols: HTTP, HTTPS, WS, WSS;
- Logging with buffering (lazy write) and rotation (keep logs N days);
- File utilities: upload, download, streaming;
- Built-in simple testing framework;
- Server health monitoring;
- Built-in data structures validation and preprocessing library;
- Task scheduling (interval or certain time);
- Request queue with timeout and size;
- Execution timeout and error handling;

## Requirements

- Node.js v12.9.0 or later (v14 preferred)
- Linux (tested on Fedora 30, Ubuntu 16, 18, 19 and 20, CentOS 7 and 8)
- Postgresql 9.5 or later (v11.8 preferred)
- OpenSSL v1.1.1 or later (optional, for https & wss)
- [certbot](https://github.com/certbot/certbot) (recommended but optional)

## License & Contributors

Copyright (c) 2012-2021 Metarhia contributors.
See github for full [contributors list](https://github.com/metarhia/impress/graphs/contributors).
Impress Application Server is [MIT licensed](./LICENSE).
Project coordinator: &lt;timur.shemsedinov@gmail.com&gt;
