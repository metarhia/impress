[![impress logo](http://habrastorage.org/files/d67/1b3/be5/d671b3be591d47a9bd10fe857e9d5319.png)](https://github.com/metarhia/impress)

[![TravisCI](https://travis-ci.org/metarhia/impress.svg?branch=master)](https://travis-ci.org/metarhia/impress)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6fb7b607a9cb445984aebbc08fdeb13c)](https://www.codacy.com/app/metarhia/impress)
[![NPM Version](https://badge.fury.io/js/impress.svg)](https://badge.fury.io/js/impress)
[![NPM Downloads/Month](https://img.shields.io/npm/dm/impress.svg)](https://www.npmjs.com/package/impress)
[![NPM Downloads](https://img.shields.io/npm/dt/impress.svg)](https://www.npmjs.com/package/impress)

[Impress](https://github.com/metarhia/impress) Application Server for
[node.js](http://nodejs.org). All decisions are made. Solutions are scaled.
Tools are provided and optimized for high load.

Impress (Impress Application Server) way:
  - Application can't include Application Server, quite the opposite,
  Application Server is a container for Applications;
  - Separate business logic and system code;
  - Applied code simplicity;
  - Support for both Stateful and Stateless approach;
  - No I/O is faster even then async I/O, so maximum memory usage and
  lazy I/O is the choice;

## Features

  - Can serve multiple applications;
  - Support multiple domains;
  - Serves multiple ports, network interfaces, hosts and protocols;
  - Can scale on multiple processes and servers;
  - Supports application sandboxing (configuration, file system, database and
  memory access isolation);
  - Utilize multiple CPU cores with instances/workers:
    - Inter-process communication (not using built-in node.js cluster library);
    - State synchronization mechanism with transactions and subscription;
  - No need to write routing manually in code, just create handler files and
  put sync or async lambdas there;
  - File system watching for cache reloading when file changes on disk;
  - Cache server-side executable JavaScript in memory;
  - API development support (simple JSON-based WEB-services development):
    - RPC-style API (Stateful, state stored in memory between requests);
    - REST-style API (Stateless, each call is separate, no state in memory);
    - JSTP (long-live and full duplex RPC/MQ over TCP or websockets);
  - Serving static files from memory with in-memory preprocessing;
  - Built-in sessions support with authentication, groups and anonymous;
  - Multiple protocols support:
    - JSTP (JavaScript Transfer Protocol) for RPC and messaging;
    See https://github.com/metarhia/jstp for details;
    - HTTP and HTTPS (node native libraries);
    - WebSockets support;
    - TCP and UDP sockets support;
  - Server-wide or application-specific logging, with log buffering
  (lazy write) and rotation (keep logs N days);
  - Connection drivers for database PostgreSQL, Relational schema generator
  from JSON database schemas;
  - File utilities: upload, download, streaming;
  - Built-in simple testing framework;
  - Server health monitoring;
  - Built-in data structures validation and preprocessing library;
  - Long workers with `client` object forwarding to separate process;
  - Task scheduling (interval or certain time);

## Installation and upgrade

- Install to the current folder: `npm install impress`
- Install using package.json: add to `dependencies` and run `npm install`
- Installation scripts for an empty server (from the scratch)
  - For CentOS 7 x64 `/deploy/centos7x64.sh`
  - For Ubuntu 14, 16 and 18 `/deploy/ubuntu.sh`
  - For Debian 8 and 9 `/deploy/debian.sh`
  - For Fedora 27, 28, 29 for x64 `/deploy/fedora.sh`

You can prepare scripts based on examples above and run at a target server
shell:
`curl http://.../install.sh | sh` or `wget http://.../install.sh -O - | sh`

If Impress Application Server is already installed in directory you want to
install/update it using npm, `/applications` directory contains applications
and `/config` contains configuration, Impress will safely detect previous
installation and update libraries and dependencies.

## Impress CLI commands

You can use following commands from any directory:
  - `impress path <path>` to display or change path to IAS
  - `impress start` to start IAS server
  - `impress stop` to stop IAS server
  - `impress restart` to restart IAS server
  - `impress status` to display IAS status
  - `impress update` to update IAS version
  - `impress autostart [on|off]` to add/remove IAS to autostart on system reboot
  - `impress list` to see IAS applications list
  - `impress add [path]` to add application
  - `impress remove [name]` to remove application
  - `impress new [name]` to create application

## Contributors

- Timur Shemsedinov (marcusaurelius)
- See github for full [contributors list](https://github.com/metarhia/impress/graphs/contributors)

## License

Dual licensed under the MIT or RUMI licenses.
Copyright (c) 2012-2019 Metarhia contributors.
Project coordinator: &lt;timur.shemsedinov@gmail.com&gt;

RUMI License: Everything that you want, you are already that.
// Jalal ad-Din Muhammad Rumi
