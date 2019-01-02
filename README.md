[![impress logo](http://habrastorage.org/files/d67/1b3/be5/d671b3be591d47a9bd10fe857e9d5319.png)](https://github.com/metarhia/impress)

[![TravisCI](https://travis-ci.org/metarhia/impress.svg?branch=master)](https://travis-ci.org/metarhia/impress)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6fb7b607a9cb445984aebbc08fdeb13c)](https://www.codacy.com/app/metarhia/impress)
[![NPM Version](https://badge.fury.io/js/impress.svg)](https://badge.fury.io/js/impress)
[![NPM Downloads/Month](https://img.shields.io/npm/dm/impress.svg)](https://www.npmjs.com/package/impress)
[![NPM Downloads](https://img.shields.io/npm/dt/impress.svg)](https://www.npmjs.com/package/impress)

[Impress](https://github.com/metarhia/impress) Application Server for
[node.js](http://nodejs.org). All decisions are made. Solutions are scaled.
Tools are provided and optimized for high load. Ready for applied development
and production.

Impress (Impress Application Server, IAS) follows alternative way in several
aspects:
  - No middleware (avoid such evil as long callback chains);
  - Monolithic high cohesion core, must-have things optimized for performance;
  - Applied code simplicity, API code high-level abstraction and brevity;
  - Support for both Stateful and Stateless approach;
  - Extensible architecture allowing to add needed features;
  - Application can't include Application Server, quite the opposite,
    Application Server is a container for Applications;
  - No I/O is faster even then async I/O, so maximum memory usage and
    lazy I/O is the choice;

## Features

  - Can serve multiple applications and sites;
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
  - Handlers inheritance override hierarchically;
  - API development support (simple JSON-based WEB-services development):
    - RPC-style API (Stateful, state stored in memory between requests);
    - REST-style API (Stateless, each call is separate, no state in memory);
    - JSTP (long-live and full duplex RPC/MQ over TCP or websockets);
  - Supported multiple AJAX API result types: JSON for most APIs (including safe
  serialization); CSV; HTML (for any extension unknown for IAS) for AJAX
  server-side HTML rendering; JSTP (for JavaScript Transfer Protocol);
  - Server-side simple templating with caching, data structures iterators and
  personalization based on user groups;
  - Serving static files with in-memory preprocessing: gzipping and HTTP
  `if-modified-since` support with HTTP 304 "Not Modified" answer; memory
  caching and file system watching for cache reloading when files changed on
  disk;
  - Built-in sessions support with authentication, groups and anonymous
  sessions;
  - Multiple protocols support:
    - JSTP (JavaScript Transfer Protocol) for RPC and messaging;
    See https://github.com/metarhia/jstp for details;
    - HTTP and HTTPS (node native libraries);
    - WebSockets support;
    - TCP and UDP sockets support;
  - Reverse-proxy (routing request to external HTTP server);
  - Server-wide or application-specific logging, with log buffering
  (lazy write) and rotation (keep logs N days);
  - Connection drivers for database engines: MongoDB, PgSQL, Oracle, MySQL,
  Relational schema generator from JSON database schemas;
  - File utilities: upload, download, streaming;
  - GeoIP support, based on `geoip-lite` module (uses MaxMind database);
  - Built-in simple testing framework;
  - Server health monitoring;
  - Built-in data structures validation and preprocessing library;
  - Long workers with `client` object forwarding to separate process;
  - Task scheduling (interval or certain time);
  - V8 features support:
    - Long stack trace with `--stack-trace-limit=1000` and stack output
    minification;
    - Wrapper for V8 internal functions with `--allow-natives-syntax`;
    - Manual garbage collection with `--nouse-idle-notification` and
    `--expose-gc`;
  - HTTP basic authentication implemented (optional omitting local requests);

## Examples

Example #1  
To create GET request handler for URL `/api/method.json`  
File `/api/method.json/get.js`
```javascript
(client, callback) => {
  callback(null, { field: 'value' });
}
```
Result: `{ "field": "value" }`

Example #2  
To create asyn GET request handler for URL `/api/asyncMethod.json`  
File `/api/asyncMethod.json/get.js`
```javascript
async client => {
  const result = { field: 'value' };
  return result;
}
```
Result: `{ "field": "value" }`

Example #3  
To create POST request handler for URL `/api/method.json`  
File `/api/method.json/post.js`
```javascript
(client, callback) => {
  dbImpress.users
  .find({ group: client.fields.group })
  .toArray(callback);
}
```
Result:
```javascript
[
  { "login": "Vasia Pupkin", "password": "whoami", "group": "users" },
  { "login": "Marcus Aurelius", "password": "tomyself", "group": "users" }
]
```

Example #4  
File `access.js` works similar to `.htaccess` and allow one to define access
rules for each folder, by simply putting `access.js` in it.  
If folder does not contain `access.js` it inherits access rules from its parent
folder, all the way up to the project root.

Example:
```javascript
{
  guests:  true,  // Allow requests from anonymous (not logged) users
  logged:  true,  // Allow requests from logged users
  http:    true,  // Allow requests using http protocol
  https:   true,  // Allow requests using https protocol
  groups:  [],    // Allow access for user groups listed in array
                  //   or for all if array is empty or no groups specified
  intro:   true,  // Generate introspection for API in this directory
  index:   false, // Generate directory index
  virtual: true   // Allow requests to virtual paths, for CMS and REST URLs
}
```

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

## Configuration

1. Install Impress as described above
2. Edit `/config/*.js` to configure Application Server
(set IP address in servers.js)
3. After installation you have `example` application in directory
`/applications`, you can rename it and/or place there other applications
4. Edit `/applications/example/config/hosts.js`, change `127.0.0.1` to
`myapp.com`, certainly you need to register and configure domain name
`myapp.com` or just add it into `hosts` file in your OS
5. Place your html to `/applications/example/app/html.template` and copy
required files into directories `/static/js`, `/static/css`, `/static/images`
and start application API development
6. Run Impress using command `service impress start` or `node server.js`

## Contributors

- Timur Shemsedinov (marcusaurelius)
- See github for full [contributors list](https://github.com/metarhia/impress/graphs/contributors)

## License

Dual licensed under the MIT or RUMI licenses.
Copyright (c) 2012-2019 Metarhia contributors.
Project coordinator: &lt;timur.shemsedinov@gmail.com&gt;

RUMI License: Everything that you want, you are already that.
// Jalal ad-Din Muhammad Rumi
