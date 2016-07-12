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
