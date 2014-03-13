0.1.14 / 2014-03-09
==================

  * Added mysql reconnection on startup and on error "PROTOCOL_CONNECTION_LOST" received

0.1.13 / 2014-03-09
==================

  * Critical fixes in logs rotation scheduler

0.1.12 / 2014-03-08
==================

  * Fixed logs rotation scheduler
  * Refactored install.js and removed setup.js

0.1.11 / 2014-03-06
==================

  * Fixed critical bug: multiple applications support renewed (last working version with multiple applications was 0.0.71)

0.1.10 / 2014-03-05
==================

  * Fixed critical security bug: access.js permission check
  * Added extra check in filesystem cache watcher to avoid exception, need further investigation

0.1.9 / 2014-02-12
==================

  * Fixes and refactoring

0.1.8 / 2014-01-31
==================

  * Fixed critical bug in inpress.js:watchCache
  * Fixed minor bug in loading empty application

0.1.7 / 2014-01-29
==================

  * DBMI connection leaking fixed
  * A few Syntactic and misspell fixes

0.1.6 / 2014-01-22
==================

  * Fixes in security subsystem and mongodb security implementation
  * Fixes in db subsystem and mongodb driver
  * Fixes in session save/restore

0.1.5 / 2014-01-19
==================

  * Fixed file watch and application cache clear procedure
  * Added example: visual setup for optional npm modules used by Impress
  * Fixed templates, allow "-" in variable names

0.1.4 / 2014-01-14
==================

  * Long worker fork implementation done (not optimized for speed and security)
  * Added example for worker fork

0.1.3 / 2014-01-14
==================

  * Critical Client fixes (non-latin unicode symbol removed)
  * Renamed impress.spawn to impress.fork
  * Long worker implementation started, Client.prototype.fork

0.1.2 / 2014-01-11
==================

  * Implemented internal URL rewriting
  * Implemented request proxy
  * Changed client.req.query to client.query
  * Added process id and marker to log
  * Refactored impress.dispatcher
  * Fixed examples

0.1.1 / 2014-01-03
==================

  * Implemented application separation in V8 "sandboxes"
  * Changed application configuration (separate section files, application separation, separated server global config)
  * Changed method of configuration files loading from "require" to "sandboxes" ("require" worcs synchronously)
  * Refactored server startup (impress.init deprecated with callbacks, now impress.server.start and events "start", "master", "worker", "stop" will be emitted instead callbacks)
  * Implemented database separation for different applications
  * Implemented URL rewriting without additional proxying overhead
  * Refactored application server soft reloading when config changed
  * Refactored global.js
  * Refactored examples

0.0.71 / 2013-12-26
==================

  * Added access check on port binding (needed for non-privileged users on unix/linux systems)
  * Changed process title for Impress processes, now you can stop all processes running in background using: killall "Impress App Srv"

0.0.70 / 2013-12-23
==================

  * Fixed disabled plugins unloading
  * Added correct mime type for .svg (by SkeLLLa)
  * Added more mime types

0.0.69 / 2013-12-20
==================

  * Methods moved from impress.events (Impress core) to impress.sse.js and renamed: userEvent to sendToUser, channelEvent to sendToChanel, globalEvent to sendGlobal
  * Fixed and improved SSE implementation
  * Added SSE example
  * Fixed multipart form-data fields (by SkeLLLa)

0.0.68 / 2013-12-18
==================

  * Modules geoip-lite, memcached, mongodb, mysql, mysql-utilities, nodemailer, websocket, zmq are excluded from dependencies to reduce Impress initial installation size, now listed modules are optional and can be added using npm install
  * Improved impress.require

0.0.67 / 2013-12-17
==================

  * Fixed startup check
  * Load additional plugins if confog.js changed and new (not loaded) plugins are found in config
  * Unload disabled plugins if they already loaded at start or previous soft restart

0.0.66 / 2013-12-16
==================

  * Fixed websocket plugin to display warning when "websocket" module not installed instead of process crash
  * Improved exceptions handling in Impress core, exceptions will be logged to file, workers will restart, master will exit on exception
  * Refactored plugins optional loader for all plugins
  * Fixed impress.log.js, prevent exception in case when other application deletes log
  * Fixed parameters in 'exit' event when spawn worker processes

0.0.65 / 2013-12-15
==================

  * SSE moved from Impress core into separate plugin impress.sse.js
  * Refactored event propagation between master and workers and between cloud controller and node clusters using IPC and ZeroMQ
  * Moved userEvent, channelEvent and globalEvent from impress.sse to impress.events namespace
  * Improved example for WebSockets
  * Directory /sites in default examples config.js file renamed to /applications

0.0.64 / 2013-12-14
==================

  * WebSockets server support (optional), use "npm install websocket" add 'impress.websocket' plugin in config
  * Added example for WebSockets, see /examples/connest.ws/get.js

0.0.63 / 2013-12-11
==================

  * Fixed templating "not found" handling
  * Fixed MongoDB security provider

0.0.62 / 2013-12-05
==================

  * Improved global.duration(number or srting "1d 10h 7m 13s") and all configurable intervals
  * Fixed log slowTime processing
  * Fixed servers, hosts and routes configuration preprocessing

0.0.61 / 2013-11-30
==================

  * Fixed event pub/sub between clusters over ZeroMQ in impress.cluster.js

0.0.60 / 2013-11-28
==================

  * Added optional/safe module loader impress.require(moduleName)
  * Added ZeroMQ support (optional/plugin)
  * Improved impress.cluster.js with ZeroMQ pub/sub and req/rep connections
  * Added SSE cross-cluster retranlation over ZeroMQ
  * Added npm programmatically API (optional/plugin) for future use in web-based setup utility
  * Moved GeoIP to optional/plugin

0.0.59 / 2013-11-22
==================

  * Fixed install script for quick example run after installation

0.0.58 / 2013-11-21
==================

  * Improved impress.health, now it works on local cluster over IPC
  * Added new callback "shutdown" in impress.init in addition to "master", "worker" and "instance"

0.0.57 / 2013-11-19
==================

  * Improved log buffering, added writeBuffer parameter (default 64kb) to config in addition to writeInterval parameter
  * Added impress.cloud.js and impress.health.js with stub cloudware functionality
  * Fixed SSE messaging propagation on cluster
  * Added filter for IPC retranslation in master process
  * Changed impress.init parameters to hash { master: callback, worker: callback, instance: callback }
  * Moved impress.log.js to plugins, so it is optional now

0.0.56 / 2013-11-15
==================

  * Fixed DBMI insert record handler and UI
  * Changed module description
  * Minor fixes in sessions and security plugin and examples

0.0.55 / 2013-11-14
==================

  * Fixed exception in filesystem cache monitoring
  * Fixed empty template detection bug if template have UTF-8 signature

0.0.54 / 2013-11-11
==================

  * Added installation script
  * Code revision and optimization

0.0.53 / 2013-11-08
==================

  * Revision of global.js, removed all browser-side code and other unnecessary code
  * Minor fixes in impress.js and impress.constants.js

0.0.52 / 2013-11-06
==================

  * Improved logging: added write buffer for high load intensive writing, default config.log.writeInterval value is 2000ms

0.0.51 / 2013-11-04
==================

  * Fixed child process termination on SIGTERM
  * Fixed non-critical memory issues

0.0.50 / 2013-10-26
==================

  * Restored MySQL "slowlog" functionality (not supported by version 0.0.48 and 0.0.49)
  * Fixed 2 non-critical memory leaks in core and db libraries

0.0.49 / 2013-10-26
==================

  * Fixed critical bug in filesystem watchers; file:impress.js; function:watchCache
  * Added timers array for watchers to minimize cache rebuilding when same file changes multiple times within small interval (2 sec)
  * Added clearCacheStartsWith into impress.js, improved and optimized
  * Fixed Impress server shutdown and restart; memory leak prevented; file:impress.js; method:impress.stop

0.0.48 / 2013-10-24
==================

  * MySQL utilities extracted into separate module, used as dependencies and placed here:
    - https://github.com/tshemsedinov/node-mysql-utilities
    - https://npmjs.org/package/mysql-utilities
  * Fixed db.mysql.schema.js and schemas in folder /schemas

0.0.47 / 2013-09-23
==================

  * Added new functionality to CMS module
  * Added Core and CMS database SQL scripts impress.core.schema.sql and impress.cms.schema.sql compiled from corresponding .js schemas by method db.schema.mysql.generateScript
  * Added SQL statements debug logging
  * Added flag res.impress.cachable, it can be set by CMS or js handlers (e.g. get.js, request.js...) to cache rendered pages in memory like we cache static files

0.0.46 / 2013-09-22
==================

  * Added CMS module with MySQL storage provider
  * Added MySQL multistatement script execution (with temporary connection)
  * Changed parameter order in impress.init(cbMasterInstance, cbWorkerInstance, cbInstance)

0.0.45 / 2013-09-17
==================

  * Changed impress.security.js, now fields login and group from user record will be copied to session for quick access
  * Added new functionality to DBMS, and removed mapreduce usage creating temporary collection for selecting all fields in MongoDB collection
  * Added new examples for Impress usage

0.0.44 / 2013-09-13
==================

  * Fixed logging, preventing zero length log files propagation

0.0.43 / 2013-09-08
==================

  * Fixed critical bug in static files caching and compressing methods

0.0.42 / 2013-09-07
==================

  * Added logs rotation (file format YYYY-MM-DD-logtype.log)
  * Added config parameter log.keepDays, if parameter exists, files older then X days in /log folder will be deleted once a day

0.0.41 / 2013-09-06
==================

  * Added HTTP request execution time measurement and logging into slow.log
  * Added debug.log
  * Changed SQL unquoted identifiers escaping
  * Added SQL query execution time measurement and slow queries logging
  * Added SQL errors logging

0.0.40 / 2013-09-05
==================

  * Added SQL editor to DBMI for executing manually entered query
  * Added SQL displaying results and errors in executing log

0.0.39 / 2013-09-04
==================

  * Added examples for Impress framework
  * Added new functionality to DBMI (beta release)

0.0.38 / 2013-09-02
==================

  * Fixed http request dispatcher (preventing socket hanging when request not match routing or virtual host rules)
  * Impress examples for developers

0.0.37 / 2013-08-31
==================

  * Fixed session restoring in mongodb security provider

0.0.36 / 2013-08-29
==================

  * Fixed security issue (http headers parsing)
  * Added new functionality to DBMI

0.0.35 / 2013-08-26
==================

  * Added new functionality to DBMI

0.0.34 / 2013-08-23
==================

  * Refactor security system, added security provider interface to store sessions in different databases
  * Added MongoDB security provider and stub for MySQL security provider
  * Fixed config for DBMI
  * Now using latest mongodb driver version >= 1.3.19 with fixed exception handling

0.0.33 / 2013-08-20
==================

  * Added new functionality to DBMI (grid editing for MySQL and grid view for MongoDB)
  * Reverted to mongodb driver version 1.3.15, because higher versions "eating" exceptions in all Impress handlers
  * Added iconv-lite dependency
  * Fixed MySQL where generator
  * Synchronized global.js versions for server and client sides

0.0.32 / 2013-08-18
==================

  * Added new functionality to DBMI interface (SQL command window, grid editing)
  * Changed DBMI to be independent from base template
  * Fixed MySQL methods
  * Fixed static reqexp generator
  * Changed core and cms database schemas

0.0.31 / 2013-08-12
==================

  * Added new functionality to database schema generator for MySQL

0.0.30 / 2013-08-11
==================

  * Added database schema generator for MySQL
  * Fixed database schema validator

0.0.29 / 2013-08-10
==================

  * Improved MySQL introspection
  * Added first version of universal database explorer for MySQL and MongoDB (under development)
  * Added first version of JSON-based database schema
  * Added database schema validator using meta-definition
  * Added two database schemas examples for "Impress Core" tables and "Impress CMS"
  * Added first version of database schema compiler for relational DBMS to generate SQL script for MySQL (under development)
  * Fixed rendering handlers in templating engine for a few content-types

0.0.28 / 2013-07-29
==================

  * Fixed escaping in .where() and .select()
  * Improved .count()

0.0.27 / 2013-07-28
==================

  * Added MySQL methods .select(), .insert(), .update(), .upsert(), .delete()
  * Changed MySQL methods .where()

0.0.26 / 2013-07-18
==================

  * Added Introspection methods .constraints(), .users()
  * Changed Introspection method .tables(), detailed table information added

0.0.25 / 2013-07-17
==================

  * Updated mysql system metadata utilities: primary, foreign, fields, databases, tables, tableInfo
  * Added mysql system metadata utilities: indexes, processes, globalVariables, globalStatus
  * Updated mysql data access utilities: queryRow, queryValue, queryArray, queryHash, queryKeyValue, count

0.0.24 / 2013-07-15
==================

  * Implemented mysql system metadata utilities: primary, foreign, fields, databases, tables, tableInfo
  * Implemented mysql data access utilities: query, queryRow, queryValue, queryArray, queryKeyValue, count

0.0.23 / 2013-07-12
==================

  * Fixed security bag in watchCache filesystem monitoring
  * Preventing watchCache firing more than one time per file change (fs.watch have a bug, it fires 3-12 times per file change depending on OS and FS)
  * Changed multi-firing prevention method for config.js reloading in preprocessConfiguration()

0.0.22 / 2013-07-10
==================

  * Fixed watchCache on stats error
  * Fixed security bag in watchCache filesystem monitoring: now have difference in processing static js files and server-side js updates

0.0.21 / 2013-07-08
==================

  * Fixed bug with refresh of static files cache when changed (fixed functions static, watchCache)
  * Added functions: compress(filePath, stats, httpCode, req, res), fileExt(fileName)

0.0.20 / 2013-07-05
==================

  * Fixed config reloading crushes in impress.restart()
  * Added dummy listener in master process to emulate
  * Added callback to impress.stop()

0.0.19 / 2013-07-04
==================

  * Implemented file uploads: req.impress.files array is accessible in "post.js" handlers
  * Startup check to prevent running if another copy is already running

0.0.18 / 2013-07-03
==================

  * Fixed routing with regexp simplified syntax (characters auto escaping ".", "?" and "/")
  * Added simple routing without regexp
  * Added "uglify-js" to minify static js files (using memory cache to avoid multiple minification)

0.0.17 / 2013-07-01
==================

  * Added interprocess SSE routing via IPC (worker sends it to master and master propagates to all other workers)
  * Added package "geoip-lite" as plugin "impress.geoip": geoData = impress.geoip.lookup(req.connection.remoteAddress);
  * Package "nodemailer" moved to plugin "impress.mail"

0.0.16 / 2013-06-30
==================

  * Added gzip compression for static files except images and small files (256 bytes)
  * Optimized HTTP 304 for gzipped static memory cache
  * Performance tested and optimized
  * Fixed HTTP headers generation: Last-Modified, Content-Type, Content-Length
  * Added method impress.signIn (session creates only if not already exists)
  * Added method impress.signOut (session remains but it unlinks user)
  * Changed impress.register, simplified for applied developers
  * Use req.impress.logged to ckeck if user logged, not req.impress.session, there are session allowed with no logged user
  * Fixed bug in restoreSession

0.0.15 / 2013-06-29
==================

  * Added static files memory cache
    * With optimization and performance test method selection
    * Static filesystem watching and cache refreshing when changed
    * Supported HTTP 304 Not Modified
  * Fixed saveSession

0.0.14 / 2013-06-28
==================

  * Implemented impress.users[] array and changed memory structure for sessions
  * Optimized cluster strategies and cluster cookie mechanism
  * Implemented channels for SSE and milticast
    * Added handlers like /name.sse/get.js with channel name definition: res.sse.channel = 'TestChannel';
    * impress.sse.userEvent(userId, eventName, data) send SSE event to all connections of given user
    * impress.sse.channelEvent(channel, eventName, data) send SSE event to all users in channel
    * impress.sse.globalEvent(eventName, data) send SSE event to all users in system

0.0.13 / 2013-06-25
==================

  * Fixed proxying (function "route" renamed to "proxy" because of naming conflict)
  * Added memcached connection plugin
  * Implemented code SSE (Server-Sent Events) event/stream support but need more development

0.0.12 / 2013-06-24
==================

  * Fixed impress.redirect (HTTP Location header)
  * Merged with tblasv fork (added existing checks for config sections)
  * Add user group access checks in access.js (no group definition or empty array [] for any logged user access)

0.0.11 / 2013-06-23
==================

  * Added access modifiers for guests and logged users, http and https protocols: access.js (groups access not implemented yet)
  * Fixed error "Can't set headers after they are sent." in impress.file
  * Renamed methods process to processing, file to filehandler
  * Changed core methods into private: dispatcher, balancer, route, processing, filehandler, execute, static
  * Changed session methods into private: restoreSession, saveSession
  * Changed utilities into private: preprocessConfiguration, staticRegExp, watchCache, baseHeader
  * Fixed bugs in impress.register and impress.sendPassword
  * Added "home" link in error page template

0.0.10 / 2013-06-22
==================

  * Graceful shutdown, signals support: SIGINT, SIGTERM
  * Fixed config reload
  * Added application cache manifest content-type
  * Fixed bug with empty template

0.0.9 / 2013-06-21
==================

  * Fixed soft config reload when config file changed (now config can be changed without restarting Impress, named servers parameters, hosts and routes can be changed, but worker number, cluster strategy and server names should not be changed)
  * Fixed impress.stop, impress.start, impress.restart, impress.init
  * Added impress.preprocessConfiguration, impress.shutdown
  * Added nodemailer to send emails from Impress applications

0.0.8 / 2013-06-20
==================

  * Added framework optional plugins in config (e.g. db drivers)
  * Fixed db.js and db.mongodb.js to be compatible with plugins
  * All db connections and drivers are optional now (edit config.plugins.require)
  * Added mysql connection driver (wrapper for npm package mysql)
  * Added example for JSON API with mysql query (other JSON examples restructured into folders)

0.0.7 / 2013-06-17
==================

  * Empty template bug found and fixed
  * Support for template files with UTF-8 BOM (Impress removes BOM when rendering)
  * Template engine optimization
  * Fixed: impress.watchCache
  * Fixed: impress.include
  * Fixed: impress.render
  * Fixed: impress.template

0.0.6 / 2013-06-16
==================

  * Added support for optional session persistence (see config: session.persist)
  * Removed vain session deletion when session identifier is empty
  * Fixed impress.saveSession
  * Fixed impress.restoreSession

0.0.5 / 2013-06-15
==================

  * Fixed callback in impress.openDatabases
  * Fixed impress.sendCookie
  * Changed license to dual licensed the MIT or RUMI licenses

0.0.4 / 2013-06-13
==================

  * Fixed .end(), .error(), .sendCookie() and impress.process()
  * Added http error page template /lib/error.template
  * Collections mimeTypes, httpErrorCodes and customHttpCodes moved from config.js into impress.constants.js

0.0.3 / 2013-06-11
==================

  * Added template specialization for user groups. Fixed method impress.template().
    * If there is active session, Impress will search for file templateName.groupName.template
    * If no group name specified it will search for templateName.everyone.template
    * If no such file found it will take templateName.template
    * If no such file found it will look into parent directory

0.0.2 / 2013-06-10
==================

  * Fixed package structure
  * Fixed callbacks in impress.register and impress.getUser
  * Fixed impress.saveSession
  * Added and changed examples, todos, history, readme
  * Changed req.context to res.context

0.0.1 / 2013-06-08
==================

  * Initial project release
