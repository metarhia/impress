0.1.367 / 2015-09-23
==================

  * Client-side code refactoring

0.1.366 / 2015-09-19
==================

  * Example application code fixes
  * Changed deploy scripts to use node.js 4.1.0

0.1.365 / 2015-09-17
==================

  * Client-side code style fixes

0.1.364 / 2015-09-16
==================

  * Removed jQuery dependency in client-side code, close #237

0.1.363 / 2015-09-15
==================

  * Client-side code refactoring

0.1.362 / 2015-09-14
==================

  * Fixed application.loadPlaceFile, now setup scripts executing just once and just in master process, close #426
  * Multiple client-side code optimizations
  * Removed jQuery dependency in all client-side code except pop-up window

0.1.361 / 2015-09-13
==================

  * WCL deprecated in client-side code
  * Removed jQuery ajax get and post dependency

0.1.360 / 2015-09-12
==================

  * Fixes in client-side code

0.1.359 / 2015-09-11
==================

  * Changed deploy scripts to use node.js 4.0.0

0.1.358 / 2015-09-10
==================

  * Impress client-side code refactoring started

0.1.357 / 2015-09-09
==================

  * WAF: configuration moved from /config/servers.js to /config/scale.js
  * WAF: implemented connection limit pre application, close #300
  * WAF: implemented connection limit pre URL, close #289
  * WAF: implemented connection limit per server
  * WAF: implemented connection limit per host
  * Fixed error logging for json handlers in Client.prototype.error

0.1.356 / 2015-09-08
==================

  * WAF: pass events from Client instead of calling inc/dec, close #421

0.1.355 / 2015-09-07
==================

  * WAF: client.block() now affect current request too, close #420
  * Fixed bug in Client.prototype.fileHandler, file watching path should be relative

0.1.354 / 2015-09-05
==================

  * WAF: limit connection number for IP, close #287
  * WAF: limit connection number for session, close #288

0.1.353 / 2015-09-04
==================

  * WAF: optimizations: waf.objects, waf.objects[name].key(client)
  * Client class optimizations and fixes: client.server, client.socket, client.schema, client.method, client.allowed

0.1.352 / 2015-09-03
==================

  * Tested compatibility with newer node and io.js, close #389
  * Fixed api.impress.require to reduce console output

0.1.351 / 2015-09-02
==================

  * Now each application is npm-compatible, have own package.json and dependencies, close #412

0.1.350 / 2015-09-01
==================

  * Reused RegExps are prepared in constants at startup, close #416
  * Fixed application.prepareScript and other minor changes
  * Code refactoring

0.1.349 / 2015-08-31
==================

  * Fixed double stack trace logging on exception, close #417

0.1.348 / 2015-08-28
==================

  * Moved logException to /lib/api.impress.js to use before Impress init and application loaded
  * Optimizations for io.js, issue #389

0.1.347 / 2015-08-25
==================

  * Added SSE, WS and RPC connections logging, close #413

0.1.346 / 2015-08-24
==================

  * Convert IPv4 to IPv6 for client.ip (used in log files and WAF)
  * Implemented WAF connection counters

0.1.345 / 2015-08-22
==================

  * WAF: structure optimized

0.1.344 / 2015-08-21
==================

  * Implemented client.block() for WAF, close #301

0.1.343 / 2015-08-20
==================

  * Web Application Firewall interface stub, issue #301, #300, #289, #288, #287
  * Removed legacy code for connection limits and deny lists

0.1.342 / 2015-08-19
==================

  * Added npm package accept-language and optimized Impress api registry

0.1.341 / 2015-08-18
==================

  * Extended server log with TCP/IP binding messages and RPC connection
  * Added CLI command "impress version" to show Impress, Node.js, v8, libuv OS versions
  * Fixed double callback on Client.prototype.runScript lazy, close #410
  * Refactored try/catch in application.createScript, close #409

0.1.340 / 2015-08-17
==================

  * Prevent double minification for JavaScript, close #367
  * Fixed workaround for server timeout after end, issue #397

0.1.339 / 2015-08-16
==================

  * Implemented workaround preventing server timeout after end, close #397

0.1.338 / 2015-08-15
==================

  * Fixed security database detection error, issue #405

0.1.337 / 2015-08-14
==================

  * impress.eventEmitter moved to api.impress, close #404
  * Merged application.createScript and application.require, close #402

0.1.336 / 2015-08-13
==================

  * Fixed state sync in cloud, close #388

0.1.335 / 2015-08-12
==================

  * Shared "SlowBuffer" for sandboxed code and added module api.buffers to api registry, close #399

0.1.334 / 2015-08-11
==================

  * Escaped special characters in log records, close #401
  * Implemented "__filename" and "__dirname" for sandboxed code, issue #399

0.1.333 / 2015-08-10
==================

  * Refactored passport plugin, close #392
  * Fixed api.impress.require to catch exceptions in broken packages, close #400
  * Code style fixes and examples refactoring due to last namespace changes

0.1.332 / 2015-08-09
==================

  * Created namespace api.con, close #317
  * Fixed api.registry and api.impress.require
  * Multiple minor fixes mostly related to api namespace refactoring

0.1.331 / 2015-08-08
==================

  * Implemented application events: "change", "changed" and "stop", close #395

0.1.330 / 2015-08-07
==================

  * Common API name registry almost ready to use, close #341
  * Implemented application events: "start" and "started", before and after initialization, issue #395
  * Removed impress from application sandbox, close #394
  * Changes in application.logException to always print stack trace, close #396
  * Refactored example application

0.1.329 / 2015-08-06
==================

  * Moved db namespace to api.db, close #393
  * Deprecated impress.API_ALIASES, api.registry used instead, close #391
  * Changes in common API name registry, issue #341

0.1.328 / 2015-08-05
==================

  * Start implementing common API namespace registry, issue #341

0.1.327 / 2015-08-04
==================

  * Fixed SSE, prevented write after end
  * Added data structures check in impress.cloud.js and impress.js, it may generate errors on very high load

0.1.326 / 2015-08-03
==================

  * Code style fixes and optimizations
  * Updated deploy scripts to node 0.12.7

0.1.325 / 2015-08-02
==================

  * Decomposed and optimized impress.startServers
  * Implemented impress.setListenerError for both HTTP and TCP servers
  * Code style fixes

0.1.324 / 2015-08-01
==================

  * Fixed critical bug in impress.loadApplications

0.1.323 / 2015-07-31
==================

  * Add host:port to error message and log record when IAS can't bind host:port and improved stack trace printing
  * Fixed bug in mongodb driver

0.1.322 / 2015-07-30
==================

  * Fixed reconnecting bugs in cross-server RPC, close #385

0.1.321 / 2015-07-29
==================

  * Refactored database names and aliases, close #384

0.1.320 / 2015-07-28
==================

  * Decomposed and optimized db.openApplicationDatabases
  * Refactored plugins, see details in github issue, close #319

0.1.319 / 2015-07-27
==================

  * Refactored applications loader, close #378
  * Fixed exception on HTTP GET to RPC handler, close #373
  * Fix HTTP 408 for dynamic handlers timeout, close #382
  * Added killall for CentOS in package impress-cli

0.1.318 / 2015-07-26
==================

  * Added log file for warnings and put all console warnings output to it, close #379
  * Added application.name to all log files, close #381
  * Security database provider now loaded automatically for database alias configured with ```security: trye```, close #380
  * Commented --max_old_space_size=2048 for default start scripts
  * Сonfig files loading moved before mixin logging plugin, issue #378
  * Fixed travis.yml, issue #376

0.1.317 / 2015-07-25
==================

  * Refactored MongoDB driver
  * Refactored tests structure, close #376
  * Fixed global database aliases, close #375

0.1.316 / 2015-07-24
==================

  * General db library refactoring

0.1.315 / 2015-07-23
==================

  * Implemented application.require and move impress.require to api.impress.require, close #372

0.1.314 / 2015-07-22
==================

  * Fixed bug in directory index implementation, close #366
  * Trying to fix integration tests on Travis CI

0.1.313 / 2015-07-21
==================

  * Fixed cross-server event propagation, close #370
  * Optimized logging and error handling

0.1.312 / 2015-07-20
==================

  * Fixed Client.prototype.stream bug, close #368
  * Added HTTP timeout to /config/servers.js (default 30s), close #369
  * Fixed socket destruction on timeout, close #365

0.1.311 / 2015-07-19
==================

  * Fixed directory index error, close #366
  * Fixed large static files ERR_CONTENT_LENGTH_MISMATCH bug, close #365

0.1.310 / 2015-07-19
==================

  * Implemented index.html for static directories, close #363
  * Safe load optional modules, impress.require instead of require

0.1.309 / 2015-07-18
==================

  * Fixed critical bug related to issue #360
  * Added sample static JSON and CSV files

0.1.308 / 2015-07-17
==================

  * Fixed HTTP 408 for ```/static/*```, close #360

0.1.307 / 2015-07-16
==================

  * Fixed config schema definition/validation, close #357

0.1.306 / 2015-07-15
==================

  * Make RPC calls in application context, issue #355

0.1.305 / 2015-07-14
==================

  * Reimplemented health monitoring using new RPC, close #346
  * Fixed ECONNRESET in RPC server, close #351
  * Fixed TCP reconnecting cloud status
  * Fixed Content-Transfer-Encoding for attachment of unknown size
  * Fixed impress.health.networkInterfaces

0.1.304 / 2015-07-13
==================

  * Logging healthfor: node, cluster and cloud, close #350
  * Reimplementing health monitoring, issue #346

0.1.303 / 2015-07-12
==================

  * Switched state sync to special packet.type: state, close #347

0.1.302 / 2015-07-11
==================

  * Fixed exception in client.cache, close #348

0.1.301 / 2015-07-10
==================

  * Connection recovery in impress.cloud RPC, close #343

0.1.300 / 2015-07-08
==================

  * Multiple improvements in TCP-based cross-server RPC, issue #321
  * State synchronization switched to new impress.cloud RPC, close #332
  * Event broker and SSE switched to impress.cloud RPC, close #331
  * RPC in standalone mode, close #337
  * Added optional fields to RPC transport: app, target, to, close #333
  * Added RPC transport to app server config: scale.js, close #339

0.1.299 / 2015-07-05
==================

  * State synchronization switch to new impress.cloud RPC, issue #332

0.1.298 / 2015-07-04
==================

  * Implemented export/import API namespaces from one application to another, close #314

0.1.297 / 2015-07-03
==================

  * Implemented ZMQ transport for RPC, issue #321
  * Tested RPC transport performance: 2 way (call+callback, serialize/deserialize): ZMQ:9271rps, IPC:18031rps, TCP:24316rps; 1 way (events): ZMQ:18300  rps, IPC:15936rps, TCP:49655rps

0.1.296 / 2015-07-02
==================

  * Refactored loops to cache length, issue #329
  * Code style fixes and dependency update

0.1.295 / 2015-07-01
==================

  * Created abstract transport and two implementations: TCP and IPX, issue #321
  * Changed config file: scale.js, "controller" removed, use "host" instead
  * Fixed sticky in impress.balancer, close #326

0.1.294 / 2015-06-29
==================

  * Implemented call and callback, issue #321
  * Optimized RPC, moved send/receive methods to socket instance using mixin upgradeSocket, issue #321
  * Optimized TCP packet fragmentation handling, issue #321
  * Now impress.cloud and socket are instances of EventEmitter, implemented events: socket:packet and impress.cloud:event, issue #321

0.1.293 / 2015-06-28
==================

  * Added TCP packet fragmentation handling (split/merge) across network, issue #321
  * Code style fixes: removed typeof from compare to undefined

0.1.292 / 2015-06-27
==================

  * Buffer concatenation optimized, close #323
  * Fixed jshint issues and changed api.impress.isIp to native net.isIP
  * Start implementing TCP-based cross-server RPC, issue #321

0.1.291 / 2015-06-25
==================

  * Optimized project path depth, close #318
  * Renamed /app folder to /server, close #320

0.1.289 / 2015-06-23
==================

  * Multiple minor fixes

0.1.287 / 2015-06-15
==================

  * Fixed installation with impress-cli as a service, close #313
  * Changed documentation about Impress installation and CLI

0.1.286 / 2015-06-15
==================

  * Fixed impress-cli, issue #313

0.1.284 / 2015-06-14
==================

  * Move /bin/* to impress-cli, issue #313

0.1.276 / 2015-06-13
==================

  * Move service start/stop functionality to js package impress-cli, issue #313

0.1.275 / 2015-06-11
==================

  * Added Impress CLI command to set impress path, issue #286

0.1.274 / 2015-06-09
==================

  * Comments added, Inch CI hints processed, close #286
  * Fixed long workers problem, close #311

0.1.273 / 2015-06-05
==================

  * Added default value in application.state.inc, close #298

0.1.272 / 2015-06-04
==================

  * Fixed /init scripts reloading on changes, close #305
  * Code style fixes and comments added

0.1.271 / 2015-06-03
==================

  * Set node rss memory limit to 2GB --max_old_space_size=2048, issue #307
  * Added auto restarting workers before hang or crash, close #307
  * Optimized date/time operations for cache and all time interval measurement places

0.1.270 / 2015-06-02
==================

  * Fixed static directory index in Client.prototype.static, close #303

0.1.269 / 2015-06-01
==================

  * Added application.limit and oprional parameter /config/application.js/rpsPerIP, issue #300
  * Added application.deny: { ips: { <ip>: { sec, rps } } }, issue #301
  * Implemented Client.prototype.checkRestrictions for issue #301 and issue #300
  * Fixed application.state examples
  * Fixed exception 'This socket is closed' in client.rpc.send, close #308

0.1.267 / 2015-05-17
==================

  * Load all MongoDB collections if list is not specified in /config/databases.js, close #294

0.1.266 / 2015-05-16
==================

  * Code style fixes, unneded code and libraries removed

0.1.265 / 2015-05-15
==================

  * Comments added and code style fixes, issue #286

0.1.264 / 2015-05-14
==================

  * Inch CI badge added, issue #286
  * Comments added, issue #286

0.1.263 / 2015-05-13
==================

  * Removed DBMI from Impress examples, issue #263
  * Removed redundant examples and code, issue #282

0.1.262 / 2015-05-11
==================

  * Added verbs, issue #280
  * Code style fixes

0.1.261 / 2015-05-10
==================

  * Templating optimization, issue #279

0.1.260 / 2015-05-09
==================

  * Extract simple templating into impress.temlating.js, close #279
  * Added 'use strict' to impress.files.js and impress.index.js

0.1.259 / 2015-05-07
==================

  * Changes in Impress CLI, issue #276

0.1.258 / 2015-05-05
==================

  * Experiments with Impress CLI, issue #276
  * Optimized cyclomatic complexity in impress.js

0.1.257 / 2015-05-04
==================

  * Fixed Content-Encoding when gzipping output to application.cache.pages, in Client.prototype.end, close #277
  * Moved Impress CLI to separate package for global installation, issue #276
  * Multiple code style fixes

0.1.256 / 2015-05-03
==================

  * Optimized cyclomatic complexity in impress.client.js, issue #275
  * Improved CLI, issue #157

0.1.255 / 2015-04-30
==================

  * Optimized cyclomatic complexity in impress.client.js, close #275
  * Refreshed dependencies versions and tested on CentOS, Debian, Ubuntu and Mint Linux

0.1.254 / 2015-04-29
==================

  * Changed all images to URL-encoded SVG in system templates to scale them for any resolution

0.1.253 / 2015-04-28
==================

  * Fixed folder index priority, if directory exists in /app and in /static, close #274
  * Fixed \r\n and automated fixing in all files before publishing
  * Fixed DBMI

0.1.252 / 2015-04-27
==================

  * Changed Node.js version to 0.12.2 in deploy scripts
  * Fixes in impress.client.js

0.1.251 / 2015-04-19
==================

  * Removed PNG logo and SVG added (scalable), fixed html and css

0.1.250 / 2015-04-08
==================

  * Fixed system templates path, close #273

0.1.249 / 2015-04-05
==================

  * Chat example added, close #272

0.1.248 / 2015-04-02
==================

  * Fixed bug in rejecting websockets connections
  * Fixed bug in setting HTTP headers for unknown MIME types
  * Added impress.rpc.absoluteUrl in init.js to connect to any host by relative handler path

0.1.247 / 2015-04-01
==================

  * Fixed \r\n in linux service files and in /lib, close #239
  * Fixed client-side init.js and impress.rpc.js

0.1.246 / 2015-03-30
==================

  * Added font MIME types
  * Added HTTP headers "Access-Control-Allow-Origin" and "Access-Control-Allow-Headers" for static files

0.1.245 / 2015-03-27
==================

  * Update dependencies
  * Unittests and integration tests added for API logging

0.1.244 / 2015-03-22
==================

  * Added universal API logging tool: api.impress.logApiMethod, issue #231
  * Improver Impress feature list and short docs in README.md

0.1.243 / 2015-03-21
==================

  * Fixed client.template, close #265
  * Fixed directory index, close #262

0.1.242 / 2015-03-20
==================

  * Cache values changed to constants, close #251

0.1.241 / 2015-03-18
==================

  * Fixed bug in systemTemplates caching, close #259
  * Changed api.impress.addTrailingSlash to api.impress.dirname

0.1.240 / 2015-03-17
==================

  * Fixed broken introspection, close #257

0.1.239 / 2015-03-15
==================

  * Remove application.*Dir properties, close #249
  * Fixed files downloading, close #255
  * Fixed paths in examples

0.1.238 / 2015-03-14
==================

  * Fixed bug in Impress RPC handlers processing when websocket plugin active and RPC plugin is disabled
  * Added Impress RPC plugin enabled by default

0.1.237 / 2015-03-11
==================

  * Cache index optimizations finished, changed to relative paths and other 8 subissues, close #230
  * Fixed application.cache.pages, all tested for highloadand and monitored for memory leaks

0.1.236 / 2015-03-10
==================

  * Fixed static cache (was disabled a few releases)
  * Cache index optimizations, issue #230

0.1.235 / 2015-03-08
==================

  * Fixed broken fs watching: application.watchCache, close #246
  * Optimized application.cache.watch hash index, issue #230

0.1.234 / 2015-03-05
==================

  * Cache index optimized, absolute paths changed to relative, issue #230
  * Fixed rare error on sthutdown, close #244
  * Added compatibility for systemd services in CentOS 7 , close #239

0.1.233 / 2015-03-03
==================

  * Fixed line end, changed CRLF to LF in service file /bin/impress, close #241
  * Added --allow-natives-syntax to service file /bin/impress

0.1.232 / 2015-03-02
==================

  * Fixed critical bug in application.loadConfigFile, affected on static file cache disabled in all workers

0.1.231 / 2015-02-28
==================

  * Fixed error message when no virtual host found for required URL, close #238

0.1.230 / 2015-02-27
==================

  * Fixes in client-side JavaScript code and code style

0.1.229 / 2015-02-23
==================

  * Updated dependencies and TravisCI configuration
  * Refactored client-side code

0.1.228 / 2015-02-21
==================

  * Fixed client-side JavaScript bugs and code style

0.1.227 / 2015-02-20
==================

  * DBMI repaired, close #235
  * If we have duplicate directories name under /static and /app mow we will process /static first, then /app, close #236

0.1.226 / 2015-02-19
==================

  * Refactored example projects, moved static files from /app to /static

0.1.225 / 2015-02-18
==================

  * Implemented cross-tab communication for Impress RPC in browser-side

0.1.224 / 2015-02-17
==================

  * Fixed WS and RPC conflict, close #228

0.1.223 / 2015-02-16
==================

  * Implemented static resources separation from server-side JavaScript and placed in /static
  * Fixed fork to be compatible with node 0.12, close #233
  * Fixed init.js
  * Fixed cookie delete issue if host name is IP address (not alpha-numeric domain name)
  * Fixed error generation at early start

0.1.222 / 2015-02-14
==================

  * Implemented separete folder for status, directory index and API introspection templates for applications, close #227
  * Fixed cycling with "Can't bind to host/post", close #229

0.1.221 / 2015-02-13
==================

  * Client-side JavaScript optimizations

0.1.220 / 2015-02-12
==================

  * Updates to Impress RPC, issue #216

0.1.219 / 2015-02-11
==================

  * File index, API introspection and preload optimizations
  * Updates to Impress RPC, issue #216

0.1.218 / 2015-02-09
==================

  * Optimization in API introspection and preload
  * Updates to Impress RPC, issue #216

0.1.217 / 2015-02-08
==================

  * Updates to Impress RPC, issue #216

0.1.216 / 2015-02-07
==================

  * Impress RPC implementation started, issue #216
  * Fixed testing and development environment

0.1.215 / 2015-02-06
==================

  * Fixed bug in /lib/api.impress.js method api.impress.log
  * Repository structure changes to make core development easy to start after clone, close #224
  * Fixed Travis CI tests

0.1.214 / 2015-02-04
==================

  * Live reload for /model, close #220
  * Fixed filesystem watch, close #221
  * Fixed \r\n and some code style issues

0.1.213 / 2015-02-03
==================

  * Improved helper API for file upload, issue #213
  * Minor code fixes

0.1.212 / 2015-02-02
==================

  * Extracted upload/download API to /lib/impress.files.js, close #219
  * Implemented support for multiple files upload using one http POST method
  * Client class methods moved across modules

0.1.211 / 2015-02-01
==================

  * Changes in helper API for file upload, issue #213

0.1.210 / 2015-01-31
==================

  * Code style and DBMI fixes

0.1.209 / 2015-01-30
==================

  * Implemented helper API for file upload, close #213
  * Code style fixes

0.1.208 / 2015-01-29
==================

  * Fixed client.cookies, close #215
  * Moved to private var of Client.prototype.processing, close #214

0.1.207 / 2015-01-28
==================

  * Added config parameters to make gzipping and minifying optional, close #211
  * Static files moved to /static
  * Code style fixes

0.1.206 / 2015-01-27
==================

  * Multiple but not critical fixes in security provider
  * Some code refactored and removed debug output

0.1.205 / 2015-01-25
==================

  * Removed wrong warning about impress.log.js not loaded
  * Tested issue #209, closed because after ```yum -y install psmisc``` killall works, close #209

0.1.204 / 2015-01-24
==================

  * Changed conditional callback, e.g. if (callback) callback(); to direct where possible

0.1.203 / 2015-01-22
==================

  * Port 80 bind conflict solved, close #210
  * Fixed and optimized impress.log.js

0.1.202 / 2015-01-20
==================

  * Improved /lib/api.v8.js, added api.v8.OPT_STATUS array and function api.v8.optimizationStatus(code), issue #205

0.1.201 / 2015-01-18
==================

  * Fixed API introspection, close #204

0.1.200 / 2015-01-17
==================

  * Added v8 optimization tools and utilities wrapper: /lib/api.v8.js
  * Added minimal application example /examples/minimalApplication
  * Extracted introspection and index to separate files

0.1.199 / 2015-01-15
==================

  * Fixed bug in pgsql plugin
  * Unittests refactored

0.1.198 / 2015-01-14
==================

  * Final global.js deprecation, issue #189
  * Plugin mixin overriding refactored, as a result security subsystem refactored

0.1.197 / 2015-01-13
==================

  * Another step to global.js deprecation, issue #189
  * Prevent security warning duplication

0.1.196 / 2015-01-12
==================

  * Changed for...in loops to integer loops in critical places, so v8 can optimize effectively
  * Added example for application internal API

0.1.195 / 2015-01-11
==================

  * Fixed MongoDB schema validation
  * Fixed double context initialization using application.callInContext(impress.initContext);
  * Moved merge and inArray from global context to api.impress namespace, issue #189

0.1.194 / 2015-01-10
==================

  * Fixed ReferenceError: login is not defined, issue #194
  * Fixed name collision dispatch/dispatcher
  * Minor code refactoring

0.1.193 / 2015-01-09
==================

  * Decomposed application.dispatcher to application.dispatchRoute
  * Optimized receiving large requests in chunks

0.1.192 / 2015-01-08
==================

  * Decomposed method dispatcher into: impress.dispatcher and application.dispatcher
  * Avoid inheritance for classes User and Session, issue #193

0.1.191 / 2015-01-07
==================

  * Optimized application classes (Client, User, Session)
  * Optimized SSE

0.1.190 / 2015-01-06
==================

  * Fixes in application classes (Client, User, Session)
  * Fixes in MongoDB security provider

0.1.189 / 2015-01-04
==================

  * Refactored security subsystem (last plugin) to new conventions, close #59
  * Changed application classes (Client, User, Session) factory to use util.inherits
  * Refactored MongoDB security provider
  * Changed application.users array key (prev key is userId, new key is user login)
  * Refactored dependent modules according to security subsystem changes
  * Fixed examples

0.1.188 / 2015-01-02
==================

  * Fixes in error handling, found while fixing issue #190

0.1.187 / 2014-12-31
==================

  * Some minor code refactoring and optimizations

0.1.186 / 2014-12-30
==================

  * Refacted api namespace to camel case, close #188

0.1.185 / 2014-12-29
==================

  * Removed unused functions and moved functions from global.js to api.impress.js, issue #189

0.1.184 / 2014-12-28
==================

  * Critical fix in Impress core, affected on strategy 'multiple' and server sockets binding
  * Refacror global.js, issue #189

0.1.183 / 2014-12-27
==================

  * Code refactoring, issue #150, #188 and #189

0.1.182 / 2014-12-26
==================

  * Move a few functions to api.impress.js, tests added
  * Implemented api.impress.spinalToCamel for issue #188

0.1.181 / 2014-12-24
==================

  * Code refactoring, close #145
  * Module impress.utilities.js renamed to api.impress.js, and is available using api.impress from application namespaces

0.1.180 / 2014-12-23
==================

  * Code refactoring, issue #145

0.1.179 / 2014-12-22
==================

  * Refactored callback (counters removed, async library used), issue #145

0.1.178 / 2014-12-21
==================

  * Code refactoring and more unit and integration tests added
  * Removed unused devDependencies

0.1.177 / 2014-12-19
==================

  * Improved handlers for streaming and big files download, close #144

0.1.176 / 2014-12-18
==================

  * Implemented handler inheritance, close #183

0.1.175 / 2014-12-17
==================

  * Issues revision and fixes, close #184, close #162, close #153

0.1.174 / 2014-12-16
==================

  * Fixed long workers, close #187
  * Improved integration tests for Impress

0.1.173 / 2014-12-15
==================

  * Deprecated application.before and .after, close #185, use end.js, lazy.js, error.js instead, issue #182

0.1.172 / 2014-12-14
==================

  * Tested fixed new handler types: end, lazy, error, close #182
  * Fixed bug in Client.prototype.error

0.1.171 / 2014-12-13
==================

  * Merged application.runScript with client.execute into client.runScript, close #186
  * Deprecated application.runScript and client.execute, issue #186

0.1.170 / 2014-12-12
==================

  * Implemented new handler type: error.js, issue #182
  * Fixed error in application.runScript

0.1.169 / 2014-12-11
==================

  * Implemented new handler types: end.js and lazy.js, issue #182
  * Added "handler" parameters to Client.prototype.execute(handler, filePath, callback)

0.1.168 / 2014-12-09
==================

  * Implemented application.before(handler) and application.after(handler), see examples, issue #170
  * Implemented client.mixin({...}) to extend application.Client class
  * Implemented Client.prototype.dispatcher as an entry point for dynamic handlers (opposite to static, proxy, index, etc.)
  * Code style refactoring

0.1.167 / 2014-12-08
==================

  * Fixed directory cache update, close #180

0.1.166 / 2014-12-06
==================

  * Changed multiple timers watcher.timers to single timer, close #147
  * Fixed exception if path does not exists, close #181

0.1.165 / 2014-12-05
==================

  * Filesystem watching API moved from impress.js to impress.application.js, methods: updateFileCache, cliearDirectoryCache, watchCache

0.1.164 / 2014-12-04
==================

  * Fixes in client.download(), issue #173
  * Added client.attachment(attachmentName, size, lastModified) to generate HTTP headers without sending data
  * Removed fallback from sticky to single strategy for windows platform, now it works

0.1.163 / 2014-12-03
==================

  * Implemented attachment file transfer: client.download(filePath, attachmentName, callback), close #173

0.1.162 / 2014-12-02
==================

  * Added special place for application libraries: /lib, close #178

0.1.161 / 2014-12-01
==================

  * Execution context domains refactored, close #167
  * Fixed error handling, close #177
  * Fixed EventEmitter memory leak in application.preprocessConfig

0.1.160 / 2014-11-30
==================

  * Core impress.js refactored, all functions moved to namespace from local context
  * Fixes in example application configuration after "api." namespace refactored

0.1.159 / 2014-11-29
==================

  * JSONP handlers implemented, example: /examples/simple/jsonpGet.jsonp, close #172
  * CSV handlers implemented, example: /examples/simple/csvStringify.csv, close #176
  * Fix sandbox api modules loading, close #174

0.1.158 / 2014-11-28
==================

  * Improve AJAX handlers, close #169
  * Middleware functions: application.get(path, handler, meta), .post, .put, .delete, close #168, related issue #165 and #165
  * Some code refactoring

0.1.157 / 2014-11-27
==================

  * Implemented middleware adapter, close #164, related issue #165
  * Added examples for middleware and some code style refactoring

0.1.156 / 2014-11-26
==================

  * Implemented programmatically adding path handlers, close #165
  * Added status 404 for js and sass parse errors, issue #163
  * Fixed bug in Client.prototype.detectRealPath

0.1.155 / 2014-11-25
==================

  * Fixed parse error on js and sass (scss) parse/preprocessing, close #163

0.1.154 / 2014-11-24
==================

  * Multiple non-critical fixes and optimizations
  * Added scale.js/watchInterval parameter for fs watch timeout, close #148

0.1.153 / 2014-11-22
==================

  * Started Impress CLI implementation, issue #157

0.1.152 / 2014-11-21
==================

  * Fixed critical bug in logging subsystem as result of config boolean validation problem
  * Optimized vm script error handling and logging

0.1.151 / 2014-11-20
==================

  * Changes in parameters processing, close #154
  * Critical fixes in data structures definition / validation, use default values

0.1.150 / 2014-11-19
==================

  * Changes in parameters processing, issue #154

0.1.149 / 2014-11-18
==================

  * Implemented handler parameters validation / auto parsing, issue #154
  * Added SSE testing application
  * Refactored client-side global.js, extracted global.browser.js

0.1.148 / 2014-11-17
==================

  * Fixes in SSE implementation after testing on desktop browsers and mobile browsers
  * Implemented cluster id generation in Impress Cloud Controller, issue #149

0.1.147 / 2014-11-16
==================

  * Fixes in SSE (for chrome), added client.heartbeat = true/false;

0.1.146 / 2014-11-15
==================

  * Added sass/scss preprocessing, refactored js minification
  * Deprecated application config parameter: files.js/minify

0.1.145 / 2014-11-14
==================

  * Fixed exception when trying to get nonexistent handler, issue #158

0.1.144 / 2014-11-13
==================

  * Added zmq transport for state sync, close #156

0.1.143 / 2014-11-11
==================

  * Implemented logging any process crash, child processes start/stop, long workers stsrt/stop/terminate, close #152
  * Fixed impress.processMarker format for long workers

0.1.142 / 2014-11-10
==================

  * Removed double message in fatalError and fixed impress.log to write fatal errors to log file, close #146
  * Added node.js internal modules tls, punycode, child_process and string_decoder to api namespace respectively as: api.tls, api.punycode, api.cp and api.sd
  * Constants refactored

0.1.141 / 2014-11-09
==================

  * Implemented merge state changes, close #142
  * Fixed application.state.delete and application.state.rollback, depricated application.state.sync, close #143
  * Examples code refactoring

0.1.140 / 2014-11-08
==================

  * Implemented state subscription, e.g. application.state.subscribe('car.speed', function(path, value) {}); issue #129, close #141
  * Fixed examples, changed impress.config.cluster to impress.config.scale, added application.state.subscribe example: /init/state.js

0.1.139 / 2014-11-07
==================

  * Implemented dev configuration, close #140
  Environment variable IMPRESS_MODE determine which config file to load, IMPRESS_MODE may be empty or have any value, "dev" is just for example.
  When IMPRESS_MODE empty or not set, file.js will be loaded and file.dev.js will not be loaded.
  When IMPRESS_MODE=dev, file.dev.js will be loaded and file.js will not be loaded except the case when file.dev.js is not exist.

0.1.138 / 2014-11-06
==================

  * Added parameter to /config/log.js example: stdout: ['error', 'debug'] output log files to stdout

0.1.137 / 2014-11-05
==================

  * Implemented state transactions and multiple additional methods to /lib/impress.state.js, issue #129
  * Changes in impress.utilities: renamed .dataByPath to .getByPath, renamed .setDataByPath to .setByPath, added .deleteByPath
  * Some code style refactoring

0.1.136 / 2014-11-04
==================

  * Fixed process forking and environment variables, impress.workerId, impress.workerTypr and impress.nodeId generation
  * Fixes in issue #114

0.1.135 / 2014-11-03
==================

  * Fixed workers list in master process and changed worker list fields, close #114

0.1.134 / 2014-11-02
==================

  * Cloud and cluster API are combined to module impress.scale.js, close #137
  * Config plugins.js is merged to sandbox.js as .config.sandbox.plugins, close #138
  * Fixed bug: prevented loading sandbox.js config file twice, close #139

0.1.133 / 2014-11-01
==================

  * Combined configs files: cluster.js and cloud.js to scale.js, close #136
  * Fixed bug crashing web sockets initialization before upgrade http connection in impress.client.js

0.1.132 / 2014-10-31
==================

  * Refactored Client methods: .static, .end, .compress, and method baseHeader is depricated, close #135
  * Fixed TCP example (telnet.js)

0.1.131 / 2014-10-30
==================

  * Moved gzip compression for JSON to higher abstraction level (Client.prototype.end), now it is also used for AJAX HTML above 256 bytes with cache support, issue #135
  * Fixed index and introspection templates (prevent double http requests on click links)

0.1.130 / 2014-10-29
==================

  * Warning: plugin api.websocket renamed to impress.websocket
  * Implemented gzip compression for handlers returning JSON above 256 bytes with cache support

0.1.129 / 2014-10-28
==================

  * Changed key in application.workers hash, it was workerId (number), not it is nodeId, e.g. C1L1390 (unique for Impress cloud), issue #114
  * Fixed bug in impress.killLongWorker

0.1.128 / 2014-10-27
==================

  * Implemented list workers programmatically from any process: application.workers, sync by IPC, issue #114

0.1.127 / 2014-10-26
==================

  * Fixed template engine, close #130

0.1.126 / 2014-10-25
==================

  * Final updates in memory state synchronization, close #129
  * Added impress.setDataByPath and fixed application.logException

0.1.125 / 2014-10-24
==================

  * Fixed Impress Cloud Controller with ZMQ transport and add examples, close #131
  * Added examples for cloud controller and 2 impress servers

0.1.124 / 2014-10-23
==================

  * Added setup script example for security database initialization for MongoDB and changed ".done" file content to full ISO timestamp
  * Begin implement memory state synchronization, issue #129
  * Added more tests and fixed examples

0.1.123 / 2014-10-22
==================

  * Impress data definition API is now implemented, tested and brought into service, close #128
  * Fixed impress.health configuration default values
  * Fixed api.definition.validate: all values with default value are now optional regardless of square brackets "[]" (default syntax for optional values)

0.1.122 / 2014-10-21
==================

  * Implemented api.definition.preprocess and api.definition.preprocessValue, issue #128
  * All default duration and size values in config files now will be processed by api.definition.preprocess in unified way, instead of manually processing for each value
  * Renamed impress.config.cluster.gc to impress.config.cluster.gcInterval

0.1.121 / 2014-10-20
==================

  * Implemented api.definition.printErrors and fixed api.definition.parse, issue #128
  * Added --nouse-idle-notification and --expose-gc examples

0.1.120 / 2014-10-18
==================

  * Added deploy script for CentOS 32bit
  * Fixes in data structures definition API, issue #128
  * Dependency updated

0.1.119 / 2014-10-17
==================

  * Fixes in data structures definition API, issue #128
  * Fixes in /schemas (config and db definitions)

0.1.118 / 2014-10-16
==================

  * Multiple fixes in data structures definition API, issue #128

0.1.117 / 2014-10-14
==================

  * Implemented new data structures definition syntax for databases, config files, etc.
  * Added universal walker for data structures: api.definition.walk, issue #128
  * Added data structures preprocessinf, including types, default values, converting size and duration to numbers: api.definition.preprocess, issue #128
  * Fixed validation method for data definition: api.definition.validate, issue #128

0.1.116 / 2014-10-13
==================

  * Added optional domain parameter for session cookie in /application/config/sessions.js, close #127

0.1.115 / 2014-10-09
==================

  * Fixed critical bug in install.js

0.1.114 / 2014-10-08
==================

  * Config schema definition applied for startup config validation, close #126
  * Code refactoring and namespace api.* changes

0.1.113 / 2014-10-07
==================

  * Added config schema definition, issue #126
  * Improved database generation from schema for MongoDB
  * Added shell script (for linux and windows) to start Impress in commend CLI (not as a service) with V8 parameter --stack-trace-limit=1000

0.1.112 / 2014-10-06
==================

  * Improved schema validation, added database generation for MongoDB

0.1.111 / 2014-10-05
==================

  * Fixed logging in non-standard situations (critical exceptions on server startup, etc.)
  * Added tests and fixed noncritical functions

0.1.110 / 2014-10-03
==================

  * Added tests and fixed noncritical functions
  * Rollback service improvements
  * Changed node.js version in deploy scripts

0.1.109 / 2014-10-02
==================

  * Minor improves in service and deploy scripts

0.1.108 / 2014-10-01
==================

  * Fixed security issue in impress.client.js

0.1.107 / 2014-09-30
==================

  * Fixed security issue in Client.prototype.processing
  * Fixed Geoip resolution in log format
  * Omit HTTP base authentication for local requests (will be configured in access.js soon)

0.1.106 / 2014-09-29
==================

  * Fixed application exception stack trace in logs, close #81
  * Added v8 option to impress service by default --stack-trace-limit=1000
  * Remove unnecessary stack info from logs

0.1.105 / 2014-09-27
==================

  * Critical fixes in templates, Warning: you need to refactor all templates, see issue for details, issue #124
  * Fixed rare happening big in Client.prototype.render
  * Changed mixins to Date.prototype to context.Date.prototype for use in sandboxed contexts

0.1.104 / 2014-09-26
==================

  * Fixed empty template inheritance, close #123
  * Fixed empty variable in templates, close #124

0.1.103 / 2014-09-25
==================

  * Added universal method application.runInContext to run impress code in context of applications (instead of deprecated impress.mixinContextScript that can run just global.js initContext function)
  * Improved global.js to prevent double context initialization
  * Fixes and optimizations in SSE plugin
  * Fixed navigation through files via arrow keys in Chrome for directory index and introspection

0.1.102 / 2014-09-24
==================

  * Fixed minor logging issue
  * Added constants and tests

0.1.101 / 2014-09-23
==================

  * Implemented page and api cache, close #121
  * Added more error handling, optimizations and refactoring

0.1.100 / 2014-09-22
==================

  * Fixed bug in file watching
  * Minor code fixes and examples added
  * Normalized CRLF for Github

0.1.99 / 2014-09-20
==================

  * Updated and optimized file watching, close #119

0.1.98 / 2014-09-19
==================

  * Event broadcasting enhancement for long workers, issue #118
  * Changes in process, worker and task forking, events sening and retranslation

0.1.97 / 2014-09-18
==================

  * Cross-process event broadcasting, close #118

0.1.96 / 2014-09-17
==================

  * Implemented setup script markers ".done" in /setup directory to mark files and run setup just at a first start, issue #66
  * Critical fixes in db module and mongodb drivers

0.1.95 / 2014-09-16
==================

  * Implemented /model/name.js and /setup/name.js, close #66
  * Optimizations and code style fixes

0.1.94 / 2014-09-15
==================

  * Fixed Unix service script problems with CRLF
  * Replaced CRLF with LF in all files
  * Replaced TAB character with double space in all files

0.1.93 / 2014-09-15
==================

  * Implemented logging enhancements, close #99
  * Some refactoring and optimization
  * Warning: application.hostDir should be renamed to application.appDir

0.1.92 / 2014-09-14
==================

  * Removed dependency to npm module

0.1.91 / 2014-09-14
==================

  * HTTP basic authentication, access.js new parameters { realm: "name", auth: "user:password" }, close #115
  * Implemented workers list and terminate programmatically, issue #114

0.1.90 / 2014-09-13
==================

  * Implemented directories autoredirect, close #113
  * Added more tests to servertests.js
  * Fixed examples

0.1.89 / 2014-09-12
==================

  * Temporary fix for "impress.security" visibility problem in application sandboxes as "security"
  * Added developer mode detection to prevent install.js actions on "npm install" if running not from "node_modules" derectory
  * Fixed: directories /init and /tasks become optional and old applications having no mentioned directories can be run without errors

0.1.88 / 2014-09-11
==================

  * Impress sessions refactored
    * client.session - > client.sid
    * client.application.sessions[client.session] -> client.session
  * Refactored impress.security.js (according to session changes)
  * Fixed examples (to comply new session changes)
  * Refactored .register() .signIn(), .signOut()
  * Moved sessionCreated and sessionModified to Client class
  * Session cookie secret, close issue #89
  * Warning: you need refactor code everywhere you use client.session

0.1.87 / 2014-09-10
==================

  * Deprecated /config/databases.js parameter: database.alias, use hash key instead
  * Sandbox namespaces are arranged, see issue for details, close #102
  * Warning: you need refactor code, replacing fs.*, async.*, ... to api.fs.*, api.async.*, ...

0.1.86 / 2014-09-08
==================

  * Extracted mixinApplication from impress.js to impress.application.js, close #106
  * Implemented initialization handlers /init/handlerName.js, close #85
  * TCP server example (cluster mode) /init/telnet.js, close #41

0.1.85 / 2014-09-07
==================

  * Deprecated impress.compress and impress.compressSend, close #105
  * Static files compressing moved to application.compress
  * Static files serving moved to Client.prototype.compress
  * Updates in impress.constants.js

0.1.84 / 2014-09-06
==================

  * Config parameter moved: impress.config.files.cacheLimit to application.config.files.cacheSize
  * Added config parameter: application.config.files.cacheMaxFileSize - maximum file size to store in memory cache
  * Implemented file streaming in static file is larger then cacheMaxFileSize, close #103

0.1.83 / 2014-09-04
==================

  * Implemented linking applications from any disk location to Impress application directory using file "application.link" containing path to application
  * Added list of local IP addresses for all network interfaces: impress.localIPs 
  * Added client.ip (containing client IP) and client.local (true or false, is client IP in impress.localIPs)
  * Added virtual group "local" in access.js to allow self requests without authentication, close #100

0.1.82 / 2014-09-03
==================

  * Implemented sending events (including SSE) from long workers
  * Temporary fix for mongodb stored sessions

0.1.81 / 2014-09-01
==================

  * Fixed bug: preload applications now omits static files, issue #96

0.1.80 / 2014-08-31
==================

  * Fixed bug: encoding user object in Client.prototype.fork, issue #96
  * JSON.stringify changed to json-stringify-safe in a few places

0.1.79 / 2014-08-30
==================

  * Fixed bug: JSON circular reference in Client.prototype.fork, close #96

0.1.78 / 2014-08-29
==================

  * Fixed bug: removed SSE plugin hidden dependence on mongo data structures, close #93
  * Implemented CORS HTTP header Access-Control-Allow-Origin, configurable in /appName/config/application.js, for example: { allowOrigin: "*" } for any domain, close #95

0.1.77 / 2014-08-28
==================

  * Fixed bug: callback first parameter check for undefined, close #92
  * Dependencies update

0.1.76 / 2014-08-26
==================

  * Implement handler metadata introspection, close #87
  * Added calback to recursive preloader, issue #84

0.1.75 / 2014-08-24
==================

  * Deep changes in server core, emulated module.exports in handlers running in sandboxes using runInNewContext, this made possible to implement issue #87
  * Implemented optional preloading application from disk to memory (/config/application.js "preload": true/false), close #84
  * Warning: if you use client.hostDir in application, you need to change it to application.hostDir

0.1.74 / 2014-08-23
==================

  * Code refactoring
  * Examples added, how to implement REST handlers with virtual paths

0.1.73 / 2014-08-21
==================

  * Hosts overlapping warning, close #83
  * Typed handlers return (method.json will return JSON on error), close #80
  * Refactored tasks scheduler, implemented tasks live reload, issue #82

0.1.72 / 2014-08-21
==================

  * Implemented tasks scheduler for application, close #82, close #22
  * Refactored and optimized configuration loader
  * Improved callback(data, [errorCode, [contentType or {headers}]]), close #79

0.1.71 / 2014-08-19
==================

  * Fixed critical bug in processing Content-Type: application/json
  * Minor fixes

0.1.70 / 2014-08-18
==================

  * Added support for sending parameters to server using Content-Type: application/json

0.1.69 / 2014-08-17
==================

  * Fixed bug in access.js/virtual, issue #76
  * Added example for virtual folders
  * Refactored Client class
  * Fixed circular redirections mechanism, issue #77

0.1.68 / 2014-08-12
==================

  * Fixed security plugin and minor code beautification

0.1.67 / 2014-08-12
==================

  * Fixed bugs in passport plugin
  * Added more examples and tests

0.1.66 / 2014-08-11
==================

  * Refactored Passport plugin
  * Removed client mixins mechanism (changed to prototype mechanism)
  * Fixed dispatcher to show 404 if no app selected

0.1.65 / 2014-08-11
==================

  * Refactored Client class
  * Refactored SSE plugin
  * Refactored WebSocker plugin
  * Events plugin separated from SSE plugin
  * Fixed examples

0.1.64 / 2014-08-08
==================

  * Added server tests for Travis CI

0.1.63 / 2014-08-06
==================

  * Fixed critical bug in url-rewriting, issue #69 (issue #70)
  * Minor fixes in examples

0.1.62 / 2014-08-04
==================

  * Fixed EPERM exception on live reload live watching, issue #65
  * Fixed start fail, issue #68

0.1.61 / 2014-08-02
==================

  * Implemented parameter "virtual" in access.js, issue #65
  * Added folders for different program logic placing (as a draft, functionality is not implemented)
  * Fixed bug in sse example and minor fixes

0.1.60 / 2014-07-30
==================

  * Fixed critical bug in Linux service

0.1.59 / 2014-07-29
==================

  * Fixed bug on empty Directory index and API Introspection index
  * Minor optimizations

0.1.58 / 2014-07-28
==================

  * Changed config files loading in series to ensure next file use results of previous, so loading order will have sense
  * Refactored api namespaces, moved to api
  * Fixed Linux service "update" and "restart" behavior, issue #63

0.1.57 / 2014-07-17
==================

  * Implemented cache memory limits, issue #60
  * Fixed cluster strategy "specialization", issue #61
  * Fixed error on live changing main impress config files: TypeError: Cannot read property 'mixinClient' of undefined; Object.application.preprocessConfig (impress.js:241:37);

0.1.56 / 2014-07-15
==================

  * Updated readme.md brief docs
  * Further refactoring code style

0.1.55 / 2014-07-12
==================

  * Refactored all modules code style

0.1.54 / 2014-07-11
==================

  * Optimized timeout error handling
  * Added logging for timed-out requests
  * Fixed deploy and service scripts

0.1.53 / 2014-07-11
==================

  * Added parameter "timeout" in /config/servers.js, default "2m", can be integer in milliseconds or string in duration format, e.g. "5s" or "1m 25s"
  * Implemented timeout error handling and displaying
  * Implemented fallback of IP "sticky" serving strategy on windows to "single" strategy

0.1.52 / 2014-07-10
==================

  * Added support for JSON config format (application specific only)
  * Refactored mixins for plugins
  * Implemented config loading priority (specified in impress.constants.js)

0.1.51 / 2014-07-07
==================

  * Fixed sessions
  * Refactored plugin impress.passport.js and auth examples
  * Fixed impress.client.js, removed dependency to impress.passport.js

0.1.50 / 2014-06-30
==================

  * Temporary revert to wrong session starting (need refactoring)

0.1.49 / 2014-06-30
==================

  * Fixed critical bug in impress.client.js: no autostarting sessions any more, to start one you should manually call client.startSession()
  * Session cookie "SID" hash algorithm changed
  * In /applications/name/config/routes.js new boolean parameter "escaping" can be used, default: true. So escaping==false "url" parameter will not be escaped
  * Fixed example application /dbmi: wcl.js added

0.1.48 / 2014-06-29
==================

  * Fixed impress.passport.js
  * Fixed global.js/duration

0.1.47 / 2014-06-24
==================

  * Fixed impress.security.js and mongodb security provider
  * Fixed api /auth in examples and tested signin/signout/register
  * Fixed wcl.js

0.1.46 / 2014-06-23
==================

  * Fixed closure to open multiple databases for one application in db.js
  * Fixed access calculations in impress.client.js
  * Minor refactoring in global.js

0.1.45 / 2014-06-19
==================

  * Fixed error logging for exceptions, improved error logging for syntax errors, but can't log line/pos because of V8 bug
  * Fixed error loffing in db.js and db driver for mongodb, mysql and pgsql
  * Some refactoring in impress.js and impress.client.js

0.1.44 / 2014-06-17
==================

  * Changes in impress.passport.js plugin: urls moved to config, no mixin to appication if no passport.js in application config
  * Prevent application from log files creating and rotation if "applicationLog" is false in application config/log.js
  * Added wcl.js to example page and other minor fixes

0.1.43 / 2014-06-16
==================

  * Fixed critical bugs with database aliases and connection visibility in /lib/db.js and /lib/db.mongodb.js
  * Fixed bug in plugin configuration for passport.js

0.1.42 / 2014-06-14
==================

  * Added passport.js as plugin with example using google oauth
  * Before using passport.js you need:
    - npm install passport
    - npm install passport-google-oauth
    - uncomment "impress.passport" in /config/plugins/js
    - edit /applications/name/config/passport.js

0.1.41 / 2014-06-11
==================

  * Fixed bug: now access.js, request.js and get/post.js is not required in application root directory
  * Optimized access calculations

0.1.40 / 2014-06-10
==================

  * Implemented log files separation for applications, see: https://github.com/tshemsedinov/impress/issues/47
  * Refactored /lib/impress.log.js
  * Added wcl.js to example application for accessing server-side APIs (predefined and introspective)
  * Fixed impress.security.js

0.1.39 / 2014-06-08
==================

  * Fixed critical bug in watching filesystem: impress.js/watchCache

0.1.38 / 2014-06-07
==================

  * Added PgSQL driver as Impress plugin, configuration and query examples
  * Fixed bug in db aliases

0.1.37 / 2014-06-04
==================

  * Enhanced unit testing
  * Added tests for /lib/global.js
  * Some minor fixes in core functions after unit testing

0.1.36 / 2014-06-03
==================

  * Added plugin for unit testing /lib/impress.tests.js
  * Added example test for /lib/impress.utilities.js

0.1.35 / 2014-05-31
==================

  * Added shell scripts for deployment from from scratch included Node.js, MongoDB and Impress
    - For CentOS /deploy/centos.sh tested for CentOS 6.5 64bit minimal (may work for Red Hat but not tested yet)
    - For Ubuntu /deploy/ubuntu.sh tested for Ubuntu 14.04 64bit minimal
    - For Debian /deploy/debian.sh tested for Debian 7.5 64bit minimal
  * Fixed /bin/install.js and /bin/uninstall.js for ubuntu and debian

0.1.34 / 2014-05-28
==================

  * Fixed critical bug in impress.js/loadApplications()

0.1.33 / 2014-05-27
==================

  * Added "use strict"; and variable declaration fixed
  * Lazy library load in sandboxes changed to delayed server start on callbacks to prevent rare instability
  * Refactored callback cbIndex/cbCount pattern

0.1.32 / 2014-05-26
==================

  * Separate sandbox configuration for all applications: sandbox.js
  * Refactored sandboxing deep, more security and fixed some namespace isolation issues
  * Refactored application config loading
  * Refactored examples according to changes above

0.1.31 / 2014-05-24
==================

  * Fixed bug in templating, for logged users who have no specialized template, now used 'everyone' template
  * Rewritten function Client.prototype.template
  * Fixed critical bug in static files dispatching

0.1.30 / 2014-05-22
==================

  * Extracted Client class from impress.js to impress.client.js
  * Extracted general purpose utilities from impress.js to impress.utilities.js

0.1.29 / 2014-05-22
==================

  * Refactored /lib/global.js to be used as mixin for global context and for sanboxed application contexts
  * Refactored file upload example
  * Proposed technique for application specific "require" and config initialization, see /applications/example/config/filestorage.js

0.1.28 / 2014-04-26
==================

  * Added boolean flag "global" to database config, database will be visible in application global if true
  * Fixed Impress security module and MongoDB Impress security provider

0.1.27 / 2014-04-25
==================

  * Fixed critical bug in serving static fro memory, removed "Transfer-Encoding" from HTTP response header according to RFC2616 Section 4.4
  * Simplified API handler result, now we can use callback(result); as client.context.data = result; callback(); old method is available as well
  * Examples refactored

0.1.26 / 2014-04-24
==================

  * Fixed critical bug calculating IP hash (caused server stop on bad IP address)
  * Fixed server core exception logging

0.1.25 / 2014-04-23
==================

  * Fixed critical bug in linux service script (restart needed after update core and packets)
  * Added new api examples

0.1.24 / 2014-04-21
==================

  * Fixed long worker fork from child process in cluster mode, it translates request to master process (via IPC message "impress:longworker") and master process forks
  * Added new api examples for mongodb, file access, request to remote api and hybrid asynchronous example

0.1.23 / 2014-04-19
==================

  * Added database shorthand for database access. Long name: client.application.databases.databaseName.collectionOrTableName.accessMethodName. Short name we can specify in appName/config/databases.js database parameter "alias"
  * Added new examples, refactored examples structure and database access
  * Fixed Client.fileHandler (callback leak)

0.1.22 / 2014-04-09
==================

  * Fixed API introspection: .existsSync replaced to asynchronous analogs with async.parallel

0.1.21 / 2014-04-08
==================

  * Added API introspection (set intro: true in access.js to switch on)
  * Added "update" command to update OS and npm: service impress update

0.1.20 / 2014-04-06
==================

  * Added system log and fixed impress.log.js, closing files with callback instead of setTimeout
  * Fixed file index template
  * Added shutdown handler for SIGINT and SIGTERM in worker processes

0.1.19 / 2014-04-03
==================

  * Fixed critical bug in npm script (install.js) to reinstall Impress as a service on npm update

0.1.18 / 2014-04-02
==================

  * Fixed shell script for running Impress as a service (if Impress is already installed you need to run impress/bin/install.sh again to refresh service script)
  * Fixed DBMI interface (for mongodb)

0.1.17 / 2014-04-01
==================

  * Fixed security issue in directory index generator: access.js will not be visible and accessible even if it matches static regexp
  * Fixed sort order in directory index, added links to each directory in path to the current
  * Added support for httpOnly cookies

0.1.16 / 2014-03-27
==================

  * Added directory index (set index: true in access.js to switch on)
  * Added API introspection stub
  * Multiple minor fixes and optimizations

0.1.15 / 2014-03-14
==================

  * Start impress automatically during the system startup
  * Become a service to be controlled from command line: service impress start|stop|restart|status

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
