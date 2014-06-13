"use strict";

(function(impress) {

	impress.os = require('os');
	impress.vm = require('vm');

	impress.initContext = require('./global');
	impress.initContext(global);
	impress.mixinContextScript = impress.vm.createScript('initContext(global);', 'impress.vm');

	require('./impress.constants');
	require('./impress.utilities');
	require('./impress.client');

	impress.isMainApplication = true;
	impress.isWin = !!process.platform.match(/^win/);

	// Node.js internal modules
	//
	impress.domain = require('domain');
	impress.crypto = require('crypto');
	impress.net = require('net');
	impress.http = require('http');
	impress.https = require('https');
	impress.dns = require('dns');
	impress.dgram = require('dgram');
	impress.url = require('url');
	impress.path = require('path');
	impress.fs = require('fs');
	impress.util = require('util');
	impress.events = require('events');
	impress.cluster = require('cluster');
	impress.querystring = require('querystring');
	impress.readline = require('readline');
	impress.stream = require('stream');
	impress.zlib = require('zlib');
	impress.exec = require('child_process').exec;

	// External modules
	//
	impress.async = require('async');
	impress.mkdirp = require('mkdirp');
	impress.colors = require('colors');
	impress.multiparty = require('multiparty');
	impress.iconv = require('iconv-lite');
	impress.npm = require("npm");

	// Paths to directories
	//
	impress.dir = process.cwd().replace(/\\/g, '/');
	impress.applicationsDir = impress.dir+'/applications';
	impress.templatesDir = impress.path.dirname(__dirname)+'/templates/';

	function logException(err) {
		var message = err.toString(),
			path = impress.isWin ? __dirname.replace(/\//g, '\\')+'\\' : __dirname+'/',
			rxPath = new RegExp(escapeRegExp(path), 'g'),
			stack = err.stack.replace(rxPath, '');
		if (impress.cluster.isMaster) console.log('Exception in master process'.red);
		if (impress.log && impress.log.error) {
			stack = stack.replace(/\n\s{4,}at/g, ';');
			impress.log.error(stack);
		} else console.log(stack);
	}

	process.on('uncaughtException', function(err) {
		logException(err);
		impress.shutdown();
	});

	// Impress safe require
	//
	impress.require = function(moduleName) {
		var lib = null;
		try { lib = require(moduleName); } catch(err) {}
		if (impress.cluster.isMaster && lib === null) {
			console.log(
				'Warning: module '+moduleName+' is not installed\n'.yellow.bold+
				'  You need to install it using '+('npm install '+moduleName).bold+' or disable in config\n'
			);
			if (impress.log) impress.log.error('Warning: module '+moduleName+' is not installed');
		}
		return lib;
	};

	impress.stat = {
		forkCount: 0,
		eventCount: 0,
		requestCount:  0,
		responseCount: 0
	};

	impress.applications = {};
	impress.server = new impress.events.EventEmitter();
	impress.configDir = impress.dir+'/config';
	impress.workers = [];
	impress.longWorkers = [];

	// Mixin application methods to given object
	// Application should have:
	//   .dir       - application root
	//   .configDir - application configuration
	//
	function mixinApplication(application, callback) {
		// Compile, execute and save script exports to cache or get exports from cache,
		//   callback(err, key, exports), where exports - function or object exported from script
		//
		application.createScript = function(key, fileName, callback) {
			var application = this,
				exports = application.cache.scripts[fileName];
			if (exports) callback(null, key, exports);
			else impress.fs.readFile(fileName, function(err, code) {
				if (!err) {
					var scriptName = fileName.replace(application.isMainApplication ? impress.dir : impress.applicationsDir, ''),
						script = impress.vm.createScript(code, scriptName);
					exports = script.runInNewContext(application.sandbox);
					application.cache.scripts[fileName] = exports;
				}
				callback(null, key, exports);
			});
		};

		// Run script in application context
		//
		application.runScript = function(fileName, client, callback) {
			var itemName = impress.path.basename(fileName, '.js');
			this.createScript(null, fileName, function(err, key, fn) {
				if (itemName == 'access') {
					client.access = fn;
					client.calculateAccess();
					callback();
				} else if (itemName == 'meta') {
					client.meta = fn;
					callback();
				} else {
					var executionDomain = impress.domain.create();
					executionDomain.on('error', function(err) {
						client.error(500);
						logException(err);
						callback();
					});
					executionDomain.run(function() {
						fn(client, function(result) {
							if (result) client.context.data = result;
							callback();
						});
					});
				}
			});
		};

		// Create application sandbox
		//
		application.createSandbox = function(callback) {
			var application = this,
				sandbox = { module:{} , initContext:impress.initContext };
			sandbox.global = sandbox;
			sandbox.application = application;
			application.sandbox = impress.vm.createContext(sandbox);
			impress.mixinContextScript.runInNewContext(application.sandbox);
			application.loadConfigFile('sandbox.js', function() {
				var modules = (application.config.sandbox) ? application.config.sandbox.modules : impress.defaultSandboxModules;
				for (var i = 0; i < modules.length; i++) {
					var moduleName = modules[i],
						module = impress[moduleName];
					if (!module) module = global[moduleName];
					if (module) application.sandbox[moduleName] = module;
				}
				callback();
			});
		};

		// Load configuration files
		//   callback(application)
		//
		application.loadConfig = function(callback) {
			var applicaion = this;
			applicaion.config = {};
			impress.fs.readdir(applicaion.configDir, function(err, files) {
				if (files) {
					var cbCount = files.length,
						cbIndex = 0,
						cb = function() { if (++cbIndex>=cbCount && callback) callback(application); };
					for (var i = 0; i < files.length; i++) {
						var file = files[i];
						if (file.endsWith(".js")) application.loadConfigFile(file, cb); else cb();
					}
				} else callback(application);
			});
			impress.watchCache(application, applicaion.configDir+'/');
		};

		// Load configuration single file
		//   callback(application)
		//
		application.loadConfigFile = function(file, callback) {
			var applicaion = this,
				configFile = applicaion.configDir+'/'+file,
				sectionName = application.getConfigSectionName(file);
			application.createScript(sectionName, configFile, function(err, key, exports) {
				application.config[key] = exports;
				callback();
			});
		};

		// Extract config section name from file path
		//
		application.getConfigSectionName = function(filePath) {
			return filePath.replace(this.configDir+'/','').replace('.js', '');
		};

		// Preprocess application configuration
		//
		application.preprocessConfig = function() {
			var applicaion = this,
				config = application.config;
			if (config.hosts) application.hostsRx = arrayRegExp(config.hosts);
			if (config.files && config.files.static) config.files.staticRx = arrayRegExp(config.files.static);
			if (config.application) config.application.slowTime = duration(config.application.slowTime || impress.defaultSlowTime);

			// Prepare application routes
			if (config.routes) {
				var routes = config.routes;
				for (var i = 0; i < routes.length; ++i) {
					var route = routes[i];
					route.urlRx = new RegExp('^'+route.url.replace(/(\/|\?|\.)/g, "\\$1").replace(/\(\\\.\*\)/, "(.*)")+'$');
					route.slowTime = duration(route.slowTime || impress.defaultSlowTime);
				}
			}
		};

		// Create or clear application cache
		//
		application.clearCache = function() {
			this.config = {};
			if (this.cache) {
				for (var watcherPath in this.cache.watchers) {
					var watcher = this.cache.watchers[watcherPath];
					for (var i = 0; i < watcher.timers.length; i++) clearTimeout(watcher.timers[i]);
					watcher.close();
				}
			}
			this.cache = {
				templates: [], // template body cache indexed by file name
				files:     [], // file override/inherited cache indexed by file name
				scripts:   [], // compiled vm scripts
				watchers:  [], // directory watchers indexed by directory name
				static:    [], // static files cache
				pages:     []  // rendered pages cache
			};
		};
		application.clearCache();
		application.createSandbox(callback);
	}

	// Load plugins
	//
	function loadPlugins() {
		if (impress.config.plugins) {
			if (impress.cluster.isMaster && impress.config.plugins.indexOf("impress.log") == -1) {
				console.log('Warning: plugin impress.log.js is not included into config require section'.yellow.bold);
			}
			// Load plugins
			for (var i = 0; i < impress.config.plugins.length; i++) {
				var pluginName = './'+impress.config.plugins[i]+'.js',
					cache = require.cache[require.resolve(pluginName)];
				if (!cache) require(pluginName);
			}
		}
	}

	// Load applications
	//
	function loadApplications(callback) {
		impress.fs.readdir(impress.applicationsDir, function(err, apps) {
			var cbCount = apps.length,
				cbIndex = 0,
				cb = function() { if (++cbIndex>=cbCount && callback) callback(); };
			for (var i in apps) {
				var appName = apps[i],
					appDir = impress.applicationsDir+'/'+appName,
					stats = impress.fs.statSync(appDir);
				(function() {
					if (stats.isDirectory() && (!impress.workerApplicationName || impress.workerApplicationName == appName)) {
						var application = new impress.events.EventEmitter();
						extend(application, { name:appName, dir:appDir, configDir:appDir+'/config', users:[], sessions:[] });
						mixinApplication(application, function() {
							application.loadConfig(function() {
								application.preprocessConfig();
								impress.applications[application.name] = application;
								impress.log.init(application);
								if (impress.passport) impress.passport.mixinApplication(application);
								application.log.open(function() {
									if (global.db) db.openApplicationDatabases(application, cb); else cb();
								});
							});
						});
					} else cb();
				} ());
			}
		});
	}

	// Fatal error with process termination
	//
	function fatalError(msg) {
		impress.log.error(msg);
		console.log(msg.red);
		process.exit(1);
	}

	var isFirstStart = true;

	// Start servers
	//
	impress.server.start = function() {
		mixinApplication(impress, function() {

			impress.workerId = impress.cluster.isMaster ? 0 : process.env['WORKER_ID'];
			impress.serverName = process.env['WORKER_SERVER_NAME'];
			if (impress.cluster.isMaster) console.log('Impress Application Server'.bold.green+' starting, reading configuration'.green);

			impress.loadConfig(function() {
				loadPlugins();
				if (impress.log) {
					impress.log.init(impress);
					impress.log.open(function() {
						if (impress.workerId == 'long') {
							impress.nodeId = impress.config.cluster.name+'L'+process.pid;
							impress.processMarker = 'Worker'+'('+impress.nodeId+')';
							impress.workerApplicationName = process.env["WORKER_APPNAME"];
							impress.workerApplicationFile = process.env["WORKER_FILE"];
							impress.workerApplicationClient = JSON.parse(process.env["WORKER_CLIENT"]);
						} else {
							impress.nodeId = impress.config.cluster.name+'N'+impress.workerId;
							process.title = 'impress'+(impress.cluster.isMaster ? ' srv':' '+impress.nodeId);
							impress.processMarker = (impress.cluster.isMaster ? 'Master':'Worker')+'('+process.pid+'/'+impress.nodeId+')';
						}
						if (impress.cluster.isMaster && impress.config.cluster && impress.config.cluster.check) {
							console.log('Startup check: '.green+impress.config.cluster.check);
							impress.http.get(impress.config.cluster.check, function(res) {
								if (res.statusCode == 404) startup();
								else fatalError('Status: server is already started');
							}).on('error', startup);
						} else startup();
					});
				}
			});

			function startup() {
				if (!impress.workerApplicationName) startWorkers();
				loadApplications(function() {
					impress.server.emit("start");
					if (impress.cluster.isMaster) {
						impress.log.server('Started');
						impress.server.emit("master");
					} else impress.server.emit("worker");
					if (impress.workerApplicationName) {
						var application = impress.applications[impress.workerApplicationName];
						application.runScript(impress.workerApplicationFile, impress.workerApplicationClient, function() {
							process.exit(0);
						});
					}
				});
				if (!impress.workerApplicationName) {
					startServers();
					if (impress.health) impress.health.init();
					if (impress.cloud)  impress.cloud.init();
					if (global.cms) cms.init();
				}
				// Set garbage collection interval
				var gcInterval = duration(impress.config.cluster.gc);
				if (typeof(global.gc) === 'function' && gcInterval > 0) {
					setInterval(function() {
						global.gc();
					}, gcInterval*1000);
				}
				isFirstStart = false;
			}
		});
	};

	// Unload configuration and stop server
	//
	impress.server.stop = function(callback) {
		var servers = impress.config.servers,
			cbCount = Object.keys(servers).length,
			cbIndex = 0;
		for (var serverName in servers) {
			var server = servers[serverName];
			if (server.listener) server.listener.close(function() {
				if (++cbIndex>=cbCount && callback) {
					impress.clearCache();
					for (var appName in impress.applications) impress.applications[appName].clearCache();
					callback();
				}
			}); else if (++cbIndex>=cbCount && callback) callback();
		}
	};

	// Reload configuration and restart server
	//
	impress.server.restart = function() {
		if (impress.config) impress.stop(function() {
			if (impress.cluster.isMaster) console.log('Reloading server configuration'.green);
			impress.config = loadConfig(configDir);
			//loadApplications();
			//preprocessConfiguration();
			impress.start();
		});
	};

	// Final shutdown
	//
	impress.shutdown = function() {
		if (impress.cluster.isMaster) {
			impress.log.server('Stopped');
			impress.server.stop();
			for (var workerId = 0; workerId < impress.workers.length; workerId++) {
				impress.workers[workerId].kill();
			}
			for (var workerId = 0; workerId < impress.longWorkers.length; workerId++) {
				impress.longWorkers[workerId].kill();
			}
			console.log('Impress shutting down'.bold.green);
		}
		if (impress.log) impress.log.close(function() {
			process.exit(0);
		});
	};

	// Start TCP, HTTP and HTTPS servers
	//
	function startServers() {
		var servers = impress.config.servers,
			workerId = 0;
		for (var serverName in servers) {
			var server = servers[serverName],
				single = impress.config.cluster.strategy == "single",
				specialization = impress.config.cluster.strategy == "specialization",
				cloned = impress.config.cluster.strategy == "multiple" || impress.config.cluster.strategy == "sticky",
				master = impress.cluster.isMaster,
				certificate = null;

			if (server.protocol == "https") {
				if (server.key && server.cert) {
					var certDir = impress.configDir+'/ssl/';
					certificate = {
						key:  impress.fs.readFileSync(certDir+server.key),
						cert: impress.fs.readFileSync(certDir+server.cert)
					};
				} else fatalError('SSL certificate is not configured for HTTPS');
			}
			if (master) {
				if (single) {
					if (server.protocol == "https")
						server.listener = impress.https.createServer(certificate, impress.dispatcher);
					else server.listener = impress.http.createServer(impress.dispatcher);
					if (impress.websocket) impress.websocket.upgradeServer(server.listener);
				} else if (cloned) {
					if (impress.config.cluster.strategy == "sticky")
						server.listener = impress.net.createServer(balancer);
					else server.listener = {
						close: function(callback) { callback(); },
						on: function() { },
						listen: function() { }
					};
				} else if (specialization && isFirstStart) impress.forkWorker(workerId++, serverName);
				console.log('  listen on '+server.address+':'+server.port);
			} else if (cloned || impress.serverName == serverName) {
				if (server.protocol == "https")
					server.listener = impress.https.createServer(certificate, impress.dispatcher);
				else server.listener = impress.http.createServer(impress.dispatcher);
				if (impress.websocket) impress.websocket.upgradeServer(server.listener);
			}
			if (server.listener) {
				server.listener.slowTime = duration(server.slowTime || impress.defaultSlowTime);
				server.listener.on('error', function(e) {
					if (e.code == 'EADDRINUSE' || e.code == 'EACCESS' || e.code == 'EACCES') fatalError('Can`t bind to host/port');
				});
				server.listener.serverName = serverName;
				if ((master && !specialization) || (!master && !cloned)) {
					if (server.nagle === false) {
						server.listener.on('connection', function(socket) {
							socket.setNoDelay();
						});
					}
					server.listener.listen(server.port, server.address);
				} else {
					if (impress.config.cluster.strategy == "sticky") server.listener.listen(null);
					else server.listener.listen(server.port, server.address);
				}
			}
		}
	}	

	// Start workers
	//
	function startWorkers() {
		process.on('SIGINT', impress.shutdown);
		process.on('SIGTERM', impress.shutdown);

		if (impress.cluster.isMaster) {
			impress.forkCount = 0;
			impress.workers = [];
			if (impress.config.cluster.strategy == "multiple" || impress.config.cluster.strategy == "sticky") {
				for (var workerId = 0; workerId < impress.config.cluster.workers; workerId++) {
					if (isFirstStart) impress.forkWorker(workerId);
				}
			}
		} else {
			process.on('message', function(message, socket) {
				if (message.name == 'impress:socket') {
					var servers = impress.config.servers;
					for (var serverName in servers) {
						var server = servers[serverName];
						if (server.address == message.address && server.port == message.port) {
							socket.server = server.listener;
							server.listener.emit('connection', socket);
						}
					}
				} else if (impress.sse && message.name == 'impress:event') {
					// Retranslate events from master to worker
					if (message.user) impress.sse.sendToUser(null, message.user, message.event, message.data, true);
					else if (message.channel) impress.sse.sendToChannel(null, message.channel, message.event, message.data, true);
					else if (message.global) impress.sse.sendGlobal(null, message.event, message.data, true);
				}
			});
		}
	}

	// Fork new worker
	// bind worker to serverName from config if serverName defined
	//
	impress.forkWorker = function(workerId, serverName) {
		var worker, env = {};
		env["WORKER_ID"] = workerId+1;
		if (typeof(serverName) !== "undefined") env["WORKER_SERVER_NAME"] = serverName;
		worker = impress.cluster.fork(env);
		worker.nodeId = impress.config.cluster.name+'N'+(workerId+1);
		impress.workers[workerId] = worker;

		worker.on('exit', function(code, signal) {
			if (worker && !worker.suicide) {
				impress.stat.forkCount++;
				impress.forkWorker(workerId);
			}
		});
	
		// Initialize IPC for interprocess event routing, from worker to master
		worker.on('message', function(message) {
			if (message.name == 'impress:event') { // propagate to all workers except of original sender
				impress.stat.eventCount++;
				if (impress.cluster.isMaster && impress.config.cloud && (impress.config.cloud.type == "server")) {
					impress.cloud.req.send(JSON.stringify(message));
				}
				for (var id = 0; id < impress.workers.length; id++) {
					if ((id != workerId) && impress.workers[id]) impress.workers[id].send(message);
				}
			} else if (message.name == 'impress:longworker') {
				impress.forkLongWorker(message.appName, message.workerFile, message.clientData);
			}
		});
	};

	// Fork long worker
	//   workerFile - filename with path
	//   appName    - application name to run worker in application context (config and database connections)
	//   clientData - JSON serialized client request data
	//
	impress.forkLongWorker = function(appName, workerFile, clientData) {
		var env = {};
		env["WORKER_ID"] = 'long';
		env["WORKER_FILE"] = workerFile;
		env["WORKER_APPNAME"] = appName;
		env["WORKER_CLIENT"] = clientData;
		var worker = impress.cluster.fork(env);
		impress.longWorkers.push(worker);
	};

	// Dispatch requests
	//
	impress.dispatcher = function(req, res) {
		impress.stat.requestCount++;
		var isDispatched = false,
			staticRx = null,
			application, client;
		for (var appName in impress.applications) {
			application = impress.applications[appName];
			client = new impress.Client(req, res, application);
            if (application.passport) application.passport.mixinClient(client);
			if (application.hostsRx.test(client.host)) {
				if (application.config.files.staticRx) staticRx = application.config.files.staticRx;
				if (application.config.application.slowTime) client.slowTime = application.config.application.slowTime;
				client.hostDir = application.dir+'/app';
				if (staticRx && staticRx.test(client.url)) {
					client.static();
					return;
				} else {
					if (application.config.routes) {
						for (var iRoute = 0; iRoute < application.config.routes.length; ++iRoute) {
							var route = application.config.routes[iRoute],
								match = req.url.match(route.urlRx);
							if (match) {
								if (route.slowTime) client.slowTime = route.slowTime;
								var urlRoute = req.url;
								if (route.rewrite && match.length > 1) {
									urlRoute = route.rewrite.replace(/\[([0-9]+)\]/g, function(s, key) {
										return match[key] || s;
									});
								} else urlRoute = route.rewrite;
								if (route.host) client.proxy(route.host, route.port || 80, urlRoute);
								else if (req.isRouted) client.error(508); else {
									req.url = urlRoute;
									req.isRouted = true;
									impress.dispatcher(req, res);
								}
								return;
							}
						}
					}
					if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
						var contentType = req.headers['content-type'];
						if (contentType && contentType.startsWith('multipart')) {
							var form = new impress.multiparty.Form();
							form.parse(req, function(err, fields, files) {
								if (err) {
									client.error(400);
									return;
								} else {
									client.files = files;
									client.fields = fields;
									client.restoreSession();
								}
							});
						} else {
							client.data = "";
							req.on("data", function(chunk) {
								client.data += chunk;
							});
							req.on("end", function() {
								client.fields = impress.querystring.parse(client.data);
								client.restoreSession();
							});
						}
					} else client.restoreSession();
					return;
				}
			}
		}
		if (!isDispatched) client.error(404);
	};

	// Balancer for sticky mode
	//
	function balancer(socket) {
		var ip;
		if (impress.config.cluster.strategy == "sticky") ip = ip2int(socket.remoteAddress);
		else if (impress.config.cluster.strategy == "multiple") ip = ~~(Math.random()*impress.workers.length);

		var worker = impress.workers[Math.abs(ip) % impress.workers.length],
			server = impress.config.servers[socket.server.serverName];
		worker.send({ name: 'impress:socket', address: server.address, port: server.port }, socket);
	}

	// Refresh static in memory cache with compression and minification
	//    required parameters: filePath, stats
	//    optional parameters: client, httpCode
	//
	impress.compress = function(filePath, stats, application, client, httpCode) {
		impress.fs.readFile(filePath, function(error, data) {
			if (error) {
				if (client) client.error(404);
			} else {
				var ext = client ? client.typeExt : impress.fileExt(filePath);
				if (ext == 'js' && application.config.files.minify) {
					data = impress.minify(data);
					stats.size = data.length;
				}
				if (!inArray(impress.compressedExt, ext) && stats.size>impress.compressAbove) {
					impress.zlib.gzip(data, function(err, data) {
						stats.size = data.length;
						if (client) {
							client.res.writeHead(httpCode, impress.baseHeader(ext, stats, true));
							client.end(data);
						}
						application.cache.static[filePath] = { data:data, stats:stats, compressed:true };
					});
				} else {
					if (client) {
						client.res.writeHead(httpCode, impress.baseHeader(ext, stats));
						client.end(data);
					}
					application.cache.static[filePath] = { data:data, stats:stats, compressed:false };
				}
				impress.watchCache(application, filePath);
			}
		});
	};

	// Send HTTP headers
	//
	impress.baseHeader = function(ext, stats, compressed) {
		compressed = typeof(compressed) !== 'undefined' ? compressed : false;
		var header = {
			'Content-Type': impress.mimeTypes[ext],
			'Cache-Control': 'public',
		};
		if (!inArray(impress.compressedExt, ext) && compressed) header['Content-encoding'] = 'gzip';
		if (stats) {
			header['Content-Length'] = stats.size;
			header['Last-Modified' ] = stats.mtime.toGMTString();
		}
		return header;
	};

	// Clear cache hash starts with given substring
	//
	function clearCacheStartingWith(cache, startsWith, callback) {
		for (var key in cache) {
			if (key.startsWith(startsWith)) {
				delete cache[key];
				if (callback) callback(key);
			}
		}
	}

	// Cache watchers
	//
	impress.watchCache = function(application, filePath) {
		var path = filePath;
		if (!filePath.endsWith("/")) path = impress.path.dirname(path)+"/";
		if (application) {
			var watcher = application.cache.watchers[path];
			if (!watcher) {
				impress.fs.exists(path, function(exists) {
					if (exists) {
						watcher = impress.fs.watch(path, function(event, fileName) {
							var filePath = (fileName) ? path+fileName : path,
								ext = impress.fileExt(fileName),
								watcher = application.cache.watchers[path];
							if (watcher.timers[filePath]) clearTimeout(watcher.timers[filePath]);
							watcher.timers[filePath] = setTimeout(function() {
								impress.fs.stat(filePath, function(err, stats) {
									if (err) return;
									if (stats.isFile()) {
										if (application.cache.static[filePath]) {
											// Replace static files memory cache
											impress.fs.exists(filePath, function(exists) {
												if (exists) impress.compress(filePath, stats, application);
											});
										} else if (ext == 'js' && (filePath in application.cache.scripts)) {
											// Replace changed js file in cache
											impress.fs.exists(filePath, function(exists) {
												if (exists) {
													application.cache.scripts[filePath] = null;
													application.createScript('', filePath, function(err, key, exports) {
														application.cache.scripts[filePath] = exports;
														if (filePath.startsWith(application.configDir)) {
															var sectionName = application.getConfigSectionName(filePath);
															application.config[sectionName] = exports;
															application.preprocessConfig();
														}
													});
												} else {
													delete application.cache.scripts[filePath];
													if (filePath.startsWith(application.configDir)) {
														var sectionName = application.getConfigSectionName(filePath);
														delete application.config[sectionName];
													}
												}
											});
										} else if (ext == 'template') {
											// Replace changed template file in cache
											delete application.cache.templates[filePath];
											delete application.cache.files[filePath];
											impress.fs.exists(filePath, function(exists) {
												if (exists) impress.fs.readFile(filePath, 'utf8', function(err, tpl) {
													if (!err) {
														if (!tpl) tpl = impress.fileIsEmpty;
														else tpl = tpl.replace(/^[\uBBBF\uFEFF]/, '');
														application.cache.templates[filePath] = tpl;
														clearCacheStartingWith(application.cache.pages, path);
													}
												});
											});
										}
									} else {
										// Clear cache for all changed folders (created or deleted files)
										clearCacheStartingWith(application.cache.static, filePath);
										clearCacheStartingWith(application.cache.files, filePath, function(used) {
											var ext = impress.fileExt(used);
											if (ext == 'js' && (used in application.cache.scripts)) {
												delete application.cache.scripts[used];
											} else if (ext == 'template' && (used in application.cache.templates)) {
												delete application.cache.templates[used];
											}
										});
										clearCacheStartingWith(application.cache.pages, filePath);
									}
								});
							}, 2000);
						});
						watcher.timers = [];
						application.cache.watchers[path] = watcher;
					}
				});
			}
		}
	};

} (global.impress = global.impress || {}));