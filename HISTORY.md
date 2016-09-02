0.3.16 / 2016-09-03
==================

  * Changed Teavis CI tests and deploy scripts for node.js 6.5.0
  * Added parsing timeout

0.3.15 / 2016-08-22
==================

  * Added simple logging for JSTP api, to be improved
  * Fixed invalid socket creation which caused TLS working not properly

0.3.14 / 2016-08-18
==================

  * Update Node.js and MetaSync versions
  * Changes in api.jstp.accessors
  * Refactored namespaces, rename JSON to api.json, issue #530

0.3.13 / 2016-08-03
==================

  * Fixed critical bug in install.js
  * Finally remove async from package.json, issue #569

0.3.12 / 2016-07-31
==================

  * Implemented events for JSTP connection, issue #518
  * Moved all asynchronous utilities to metasync, issue #569
  * Fixed event mapping in WebSocketAdapter

0.3.11 / 2016-07-27
==================

  * Implemented events for JSTP connection, issue #518
  * Fixed critical port binding bug, issue #574
  * Changes in asynchronous utilities, issue #569

0.3.10 / 2016-07-22
==================

  * Implemented JSTP over TLS
  * Implemented JSTP over and WebSocket (both HTTP and HTTPS)
  * Implemented client-side JSTP over WebSocket in browser
  * Implemented client-side Sandbox class
  * Removed old AJAX and WebSocket RPC
  * Renamed plugin impress.waf.js to impress.firewall.js
  * Renamed config keepAliveTimeout to keepAlive
  * Renamed config watchInterval to watch
  * Renamed config waf to firewall
  * Renamed config gcInterval to gc

0.3.9 / 2016-07-19
==================

  * Added metasync library

0.3.8 / 2016-07-17
==================

  * Refactor RemoteError class constructor
  * Finally removed async from Impress core, issue #453
  * Fixed impress.js

0.3.7 / 2016-07-13
==================

  * Changed JSTP methods invocation conventions, issue #561

0.3.6 / 2016-07-13
==================

  * Implemented remote methods and remote eventEmitter
  * Added new packet type for JSTP: inspect
  * Added Connection.prototype.inspect method and wrappers for remote methods
  * Improved JSTP callbacks functionality, added RemoteError

0.3.5 / 2016-07-11
==================

  * Critical bugs fixed, core refactored, Travis CI tests fixed
  * Added event `impress.server.on('started')` after all apps loaded, processes forked and ports opened

0.3.4 / 2016-07-10
==================

  * Fixed critical bug, issue #557

0.3.3 / 2016-07-10
==================

  * Fixed critical bug removing experiments

0.3.2 / 2016-07-09
==================

  * Remove middleware emulation
  * Bind applications to servers, issue #534
  * Do not run Business-Ligic in master process, issue #552
  * Changed Teavis CI tests and deploy scripts for node.js 6.3.0
  * Fixed Travis CI tests, remove old versions (less then 4.0)
  * Examples refactored to ES6
  * Database schemas refactored to JSTP in api.definition.require
  * Removed JSON configs, we will support just JS configs

0.3.1 / 2016-07-03
==================

  * Forked from v.0.1.423, see issue #527 for versioning plan
