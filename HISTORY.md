0.2.9 / 2016-11-28
==================

  * Multiple updates from 0.3.x

0.2.7 / 2016-07-31
==================

  * Implemented events for JSTP connection, issue #518
  * Fixed critical port binding bug, issue #574
  * Fixed event mapping in WebSocketAdapter
  * Moved all asynchronous utilities to metasync, issue #569
  * Dependency versioning fixed

0.2.6 / 2016-07-22
==================

  * Implemented JSTP over TLS
  * Implemented JSTP over and WebSocket (both HTTP and HTTPS)
  * Implemented client-side JSTP over WebSocket in browser
  * Implemented client-side Sandbox class
  * Added metasync library
  * Removed old AJAX and WebSocket RPC
  * Renamed plugin impress.waf.js to impress.firewall.js
  * Renamed config keepAliveTimeout to keepAlive
  * Renamed config watchInterval to watch
  * Renamed config waf to firewall
  * Renamed config gcInterval to gc

0.2.5 / 2016-07-17
==================

  * Finally removed async from Impress core, issue #453
  * Changed JSTP methods invocation conventions, issue #561
  * Implemented remote methods and remote eventEmitter
  * Added new packet type for JSTP: inspect
  * Added Connection.prototype.inspect method and wrappers for remote methods
  * Improved JSTP callbacks functionality, added RemoteError

0.2.3 / 2016-07-11
==================

  * Critical bugs fixed, core refactored, Travis CI tests fixed
  * Added event `impress.server.on('started')` after all apps loaded, processes forked and ports opened
  * Fixed critical bug, issue #557

0.2.2 / 2016-07-09
==================

  * Remove middleware emulation
  * Bind applications to servers, issue #534
  * Do not run Business-Ligic in master process, issue #552
  * Changed Teavis CI tests and deploy scripts for node.js 6.3.0
  * Database schemas refactored to JSTP in api.definition.require
  * Removed JSON configs, we will support just JS configs

0.2.1 / 2016-07-02
==================

  * Forked from v.0.1.423, see issue #527 for versioning plan
