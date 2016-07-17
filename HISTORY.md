0.2.4 / 2016-07-17
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
