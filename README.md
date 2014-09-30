![impress logo](http://habrastorage.org/storage3/ca7/287/cd2/ca7287cd25f773d75e59a266698258a0.png)

# Impress

[![Build Status](https://travis-ci.org/tshemsedinov/impress.svg?branch=master)](https://travis-ci.org/tshemsedinov/impress)
[![Dependency Status](https://david-dm.org/tshemsedinov/impress.svg)](https://david-dm.org/tshemsedinov/impress)
[![devDependency Status](https://david-dm.org/tshemsedinov/impress/dev-status.svg)](https://david-dm.org/tshemsedinov/impress#info=devDependencies)
[![NPM version](https://badge.fury.io/js/impress.svg)](http://badge.fury.io/js/impress)

[Impress](https://github.com/tshemsedinov/impress)ive multipurpose Application Server for [node.js](http://nodejs.org). All decisions are made. Solutions are scaled. Tools are provided and optimized for high load. Ready for applied development and production.

Impress follows alternative way in several aspects:
  - No callback chain (no middleware), hierarchically inheritable hash routing instead
  - Monolithic high coupling core with obligatory things optimized for performance
  - Extensible plug-ins format for optionally needed things
  - Applied code simplicity, API code high-level abstraction and brevity
  - Support for both Stateful and Stateless approach
  - Application can't include Application Server, quite the opposite, Application Server is a container for Applications
  - No I/O is faster even then async I/O, so maximum memory usage and lazy I/O is the choice

## Installation and upgrade

  - Install to project folder (mostly for development): `npm install impress` and configure
  - Install as a service for Linux: create directory `/impress` and type: `npm install impress`
  - Install using package.json and `npm install`: not recommended but if you know what you're doing...
  - Installation scripts for empty server (from the scratch)
    - For CentOS /deploy/centos.sh (tested on CentOS 6.5 64bit minimal)
    - For Ubuntu /deploy/ubuntu.sh (tested on Ubuntu 14.04 64bit minimal)
    - For Debian /deploy/debian.sh (tested for Debian 7.5 64bit minimal)
  
You can prepare scripts based on examples above and run at a target server shell:
`curl http://host/path/install.sh | sh` or `wget http://host/path/install.sh -O - | sh`

To upgrade Impress version you can type 'npm update' in Impress folder, but if Impress installed as a service it is better to use service CLI, see commands below.
If Impress Application Server is already installed in directory you want to install/update it using npm, /applications directory contains applications and /config contains configuration, you do not have to worry Impress will detect previous installation and will update just it's own libraries and dependencies.

## Service (daemon) commands

If Impress installed as a service (daemon) you can use following commands:
  - `service impress start`
  - `service impress stop`
  - `service impress restart` is equal to `stop` and `start` commands
  - `service impress status` to show Impress processes CPU, MEM, RSS, TIME and other parameters
  - `service impress update` to update and restart Application Server

## Features

  - Can serve multiple applications and sites on multiple domains
  - Serves multiple ports, network interfaces, hosts and protocols
  - Can scale on multiple servers
  - Supports application sandboxing (configuration, db and memory access isolation)
  - Supports one or multiple CPU cores with following instantiation strategies:
    - Single instance (one process)
    - Instance specialization (multiple processes, one master and different workers for each server)
    - Multiple instances (multiple processes, one master and identical workers with no sticky)
    - IP sticky (multiple processes, one master and workers with serving sticky by IP)
  - URL routing based on file system
    - Caching server-side executable JavaScript in memory
    - File system watching for cache reloading when file changes on disk
  - API development support (simple way for JSON-based WEB-services development)
    - RPC-style API (Stateful, state stored in memory between requests)
    - REST-style API (Stateless, each call is separate, no state in memory)
  - Server server-side simple templating
    - Caching templates in memory and ready (rendered) pages optional caching
    - Supports array and hash iterations and sub-templates including
    - Template personalization for user groups
  - Application config changes with zero downtime
    - Flexible configuration in JS or JSON format
    - File watch and automatic soft reloading when config.js file changes
    - No Impress server hard restarting
  - Serving static files
    - Gzipping and HTTP request field "if-modified-since" field support and HTTP 304 "Not Modified" answer
    - Memory caching and file system watching for cache reloading when files changed on disk
    - JavaScript optional (configurable) minification, based on module "uglify-js" as Impress plug-in
  - Built-in sessions support with authentication and user groups and anonymous sessions
    - Sessions and cookies (memory state or persistent sessions with MongoDB)
    - Access modifiers for each folder in access.js files and access inheritance
  - Implemented SSE (Server-Sent Events) with channels and multi-cast
  - WebSockets support (even on shared host/port with other handlers, using regular connection upgrade)
  - Reverse-proxy (routing request to external HTTP server with URL-rewriting)
  - Logging: "access", "debug", "error and "slow" logs
    - Log rotation: keep logs N days (configurable) delete files after N days
    - Log buffering, write stream flushing interval
    - Each application can be logged to own folder and/or to server-wide logs
  - Connection drivers for database engines:
    - MySQL data access layer based on felixge/mysql low-level drivers (separate module "musql-utilities")
      - MySQL Data Access Methods: queryRow, queryValue, queryCol, queryHash, queryKeyValue
      - MySQL Introspection Methods: primary, foreign, constraints, fields, databases, tables, databaseTables, tableInfo, indexes, processes, globalVariables, globalStatus, users
      - MySQL SQL Autogenerating Methods: select, insert, update, upsert, count, delete
      - Events: 'query', 'slow'
    - MongoDB drivers as Impress plug-in
    - PgSQL drivers as Impress plug-in
    - Memcached drivers as Impress plug-in
    - Relational schema generator from JSON database schemas
  - Sending Emails functionality using "nodemailer" module as Impress plug-in
  - IPC support (interprocess communications) for event delivery between Node.js instances
  - Integrated DBMI (Web-based management interface for MySQL and MongoDB)
  - GeoIP support, based on "geoip-lite" module as Impress plug-in (uses MaxMind database)
  - Social networking login using Passport.js as plug-in
  - Built-in simple testing framework
  - Server health monitoring

## Examples

Example #1
File `/api/method.json/get.js`, Request type `GET`
```javascript
module.exports = function(client, callback) {
    callback({ field: "value" });
}
```
Result: `{ "field": "value" }`

Example #2
File `/api/method.json/post.js`, Request type `POST`
```javascript
module.exports = function(client, callback) {
    dbImpress.users.find({ group: client.fields.group }).toArray(function(err, nodes) {
        callback(nodes);
    });
}
```
Result:
```javascript
[
    { "login": "Vasia Pupkin", "password": "whoami", "group": "users" },
    { "login": "Marcus Aurelius", "password": "tomyself", "group": "users" }
]
```

Example #3
File "access.js" is something line ".htaccess", you can easily define access restrictions for each folder, placing "access.js" in it.
If folder not contains "access.js" it will inherit from parent folder and so on. Example:
```javascript
module.exports = {
    guests:  true,  // Allow requests from anonimous users (not logged or no session started)
    logged:  true,  // Allow requests from logged users
    http:    true,  // Allow requests using http protocol
    https:   true,  // Allow requests using https protocol
    groups:  [],    // Allow access for user groups listed in array
                    //   or for all if array is empty or no groups field specified
    intro:   true,  // Generate introspection for API methods in this directory
    index:   false, // Generate directory index
    virtual: true   // Allow requests to virtual paths, for CMS and REST URLs, etc.
}
```

Example #4
File `/api/method.json/post.js`, Request type `POST`
```javascript
module.exports = function(client, callback) {
    dbImpress.users.find({ group: client.fields.group }).toArray(function(err, nodes) {
        callback(nodes);
    });
}
```
Result:
```javascript
[
    { "login": "Vasia Pupkin", "password": "whoami", "group": "users" },
    { "login": "Marcus Aurelius", "password": "tomyself", "group": "users" }
]
```

## Configuration

1. Install Impress as described above.
2. Example application will start automatically and will open `http://127.0.0.1/`
3. Edit `/config/*.js` to configure Application Server
4. You can create a directory for your new application inside `/applications`, for example: `/applications/myapp` and copy `/applications/example` into this directory to start with
5. Edit `/applications/myapp/config/hosts.js`, change `127.0.0.1` to `myapp.com`, certainly you need to register and configure domain name myapp.com or just add it into `hosts` file in your OS
6. Place your html to `/applications/myapp/app/html.template` and required files into directories `/js`, `/css`, `/images` and write API in live environment without restart
7. Run Impress using command `service impress start` (if installed as a service) or `node server.js`

## Contributors

  - Timur Shemsedinov (marcusaurelius)
  - See github contributors list

## License

Dual licensed under the MIT or RUMI licenses.

Copyright (c) 2012-2014 MetaSystems &lt;timur.shemsedinov@gmail.com&gt;

RUMI License: Everything that you want, you are already that.
// Jalal ad-Din Muhammad Rumi
