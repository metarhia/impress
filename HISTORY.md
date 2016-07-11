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
