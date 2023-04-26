<div align="center">

[![impress logo](https://raw.githubusercontent.com/metarhia/Metarhia/master/Logos/impress-header.png)](https://github.com/metarhia/impress)
[![ci Status](https://github.com/metarhia/impress/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/impress/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![snyk](https://snyk.io/test/github/metarhia/impress/badge.svg)](https://snyk.io/test/github/metarhia/impress)
[![npm downloads/month](https://img.shields.io/npm/dm/impress.svg)](https://www.npmjs.com/package/impress)
[![npm downloads](https://img.shields.io/npm/dt/impress.svg)](https://www.npmjs.com/package/impress)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/impress/blob/master/LICENSE)

</div>

**Enterprise** application server for **[Node.js](http://nodejs.org)**: secure,
lightweight, interactive, and scalable.

## Description

**First** Node.js server scaled with **multithreading** and extra thin workload
**isolation**. Optimized for **high-intensive** data exchange, rapid development,
and **clean architecture**. Provides everything you need out of the box for
**reliable** and **efficient backend**, network communication with web and mobile
clients, protocol-agnostic **API**, run-time type validation, real-time and
in-memory data processing, and **reliable stateful** services.

**Weak sides**: not a good choice for content publishing including blogs and
online stores, server-side rendering, serving static content and stateless
services.

**Strong sides**: security and architecture for enterprise-level applications,
long-lived connections over websocket to minimize overhead for cryptographic
handshake, no third-party dependencies.

## Quick start

- See project template: [metarhia/Example](https://github.com/metarhia/Example)
- Start server with `node server.js`
- See [documentation and specifications](https://github.com/metarhia/Contracts)

API endpoint example: `application/api/example.1/citiesByCountry.js`

```js
async ({ countryId }) => {
  const fields = ['cityId', 'name'];
  const where = { countryId };
  const data = await db.select('City', fields, where);
  return { result: 'success', data };
};
```

You can call it from client-side:

```js
const res = await metacom.api.example.citiesByCountry({ countryId: 3 });
```

## Metarhia and impress application server way

- Applied code needs to be simple and secure, so we use sandboxing with v8
  isolated contexts, worker threads and javascript closures;
- Domain code should be separated from system code; so we use DDD, layered
  (onion) architecture, DI, SOLID and GRASP principles, contract-based approach;
- Impress supports stateful applications with RPC and client-session sticky to
  servers; microservices, centralized or distributed architecture;
- No I/O is faster even than async I/O, so we hold state in memory, share it
  among multiple threads and use lazy I/O for persistent storage;
- We use just internal trusted dependencies, no third-party npm packages;
  total Metarhia technology stack size is less than 2mb.

## Features

- **Auto API routing**, just create endpoint files as an async function;
- Code **live reload** with file system watch (when files change on disk);
- **Graceful shutdown** and application state recovery after reload;
- **Minimal dependencies** and code size;
- Can scale with **multiple threads** and servers;
- Code **sandboxing** for security and context isolation;
- Auto module loader with **dependency injection** for namespaces;
- **Layered architecture** out of the box: core, domain, API, client;
- Utilize multiple CPU cores and serve multiple ports with worker threads;
- Inter-process communication and shared memory used for state management;
- State synchronization mechanism with transactions and subscription;
- Cache server-side executable JavaScript in memory;
- Rapid **API** development support: AJAX RPC and **Websocket**;
- Serve static files from memory cache;
- Application configuration (for different named environments);
- Database access layer for PostgreSQL and relational db schemas;
- Persistent sessions support with authentication, groups, and anonymous;
- Multiple protocols: HTTP, HTTPS, WS, WSS;
- Logging with buffering (lazy write) and rotation (keep logs N days);
- File utilities: upload, download, streaming;
- Built-in simple testing framework;
- Server health monitoring;
- Built-in data structures validation and preprocessing library;
- Task scheduling (interval or certain time);
- Concurrency control: request queue with timeout and size;
- Execution timeout and error handling;

## Requirements

- Node.js v16.0.0 or later (v18 preferred)
- Linux (tested on Fedora 36, 37, Ubuntu 18, 20 and 22, CentOS 7, 8, 9)
- Postgresql 11 or later (v14 preferred)
- OpenSSL v3 or later (optional, for https & wss)
- [certbot](https://github.com/certbot/certbot) (recommended but optional)

## License & Contributors

Copyright (c) 2012-2023 Metarhia contributors.
See github for full [contributors list](https://github.com/metarhia/impress/graphs/contributors).
Impress Application Server is [MIT licensed](./LICENSE).
Project coordinator: &lt;timur.shemsedinov@gmail.com&gt;
