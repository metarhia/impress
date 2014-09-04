"use strict";

global.impress = {};
global.api = {};

api.console = console;
api.require = require;
api.os = require('os');
api.vm = require('vm');

impress.initContext = require('./global');
impress.initContext(global);
impress.mixinContextScript = api.vm.createScript('initContext(global);', 'impress.vm');

require('./impress.constants');
require('./impress.utilities');
require('./impress.client');

impress.isMainApplication = true;
impress.isWin = !!process.platform.match(/^win/);

// Node.js internal modules
//
api.domain = require('domain');
api.crypto = require('crypto');
api.net = require('net');
api.http = require('http');
api.https = require('https');
api.dns = require('dns');
api.dgram = require('dgram');
api.url = require('url');
api.path = require('path');
api.fs = require('fs');
api.util = require('util');
api.events = require('events');
api.cluster = require('cluster');
api.querystring = require('querystring');
api.readline = require('readline');
api.stream = require('stream');
api.zlib = require('zlib');
api.exec = require('child_process').exec;

// External modules
//
api.async = require('async');
api.mkdirp = require('mkdirp');
api.colors = require('colors');
api.multiparty = require('multiparty');
api.iconv = require('iconv-lite');
api.stringify = require('json-stringify-safe');
api.npm = require('npm');

// Paths to directories
//
impress.dir = process.cwd().replace(/\\/g, '/');
impress.applicationsDir = impress.dir+'/applications';
impress.templatesDir = api.path.dirname(__dirname).replace(/\\/g, '/')+'/templates/';

process.on('uncaughtException', function(err) {
	if (impress.logException) impress.logException(err);
	else console.log("Can't log uncaught Exception");
	impress.shutdown();
});

// Impress safe require
//
impress.require = function(moduleName) {
	var lib = null;
	try { lib = require(moduleName); } catch(err) {}
	if (api.cluster.isMaster && lib === null) {
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
impress.server = new api.events.EventEmitter();
impress.configDir = impress.dir+'/config';
impress.workers = [];
impress.longWorkers = [];

// Mixin application methods to given object
// Application should have:
//   .dir       - application root
//   .configDir - application configuration
//   .tasksDir  - application tasks (optional)
//
function mixinApplication(application, callback) {

	application.config = {};
	application.tasks = {};

	// Compile, execute and save script exports to cache or get exports from cache,
	//   callback(err, key, exports), where exports - function or object exported from script
	//
	application.createScript = function(key, fileName, callback) {
		var exports = application.cache.scripts[fileName];
		if (exports && callback) callback(null, key, exports);
		else api.fs.readFile(fileName, function(err, code) {
			if (!err) {
				var scriptName = fileName.replace(application.isMainApplication ? impress.dir : impress.applicationsDir, '');
				try {
					var script = api.vm.createScript(code, scriptName);
					application.sandbox.module = {};
					script.runInNewContext(application.sandbox);
					exports = application.sandbox.module.exports;
					application.sandbox.module = {};
				} catch(err) {
					err.stack = err.toString()+' in '+scriptName;
					application.logException(err);
				}
				application.cache.scripts[fileName] = exports;
			}
			if (callback) callback(null, key, exports);
		});
	};

	// Run script in application context
	//
	application.runScript = function(fileName, client, callback) {
		var itemName = api.path.basename(fileName, '.js');
		application.createScript(null, fileName, function(err, key, fn) {
			if (itemName === 'access') {
				client.access = extend(client.access, fn);
				client.calculateAccess();
				callback();
			} else {
				var executionDomain = api.domain.create();
				executionDomain.on('error', function(err) {
					client.error(500);
					application.logException(err);
					callback();
				});
				executionDomain.run(function() {
					if (typeof(fn) === 'function') fn(client, function(result, errorCode, headers) {
						if (typeof(result) !== 'undefined') client.context.data = result;
						if (errorCode) client.res.statusCode = errorCode;
						if (headers && !client.res.headersSent) {
							if (typeof(headers) === "string") client.res.setHeader('Content-Type', headers);
							else for (var headerName in headers) client.res.setHeader(headerName, headers[headerName]);
						}
						callback();
					}); else callback();
				});
			}
		});
	};

	// Create application sandbox
	//
	application.createSandbox = function(callback) {
		var sandbox = { module:{}, initContext:impress.initContext };
		sandbox.global = sandbox;
		sandbox.application = application;
		application.sandbox = api.vm.createContext(sandbox);
		impress.mixinContextScript.runInNewContext(application.sandbox);
		application.loadConfigFile('sandbox.js', function() {
			var modules = (application.config.sandbox) ? application.config.sandbox.modules : impress.defaultSandboxModules,
				module, moduleName;
			for (var i = 0; i < modules.length; i++) {
				moduleName = modules[i];
				module = api[moduleName];
				if (!module) module = global[moduleName];
				if (module) application.sandbox[moduleName] = module;
			}
			callback();
		});
	};

	// Preload all handlers in directory
	//   relPath - relative path from /app
	//   depth - recursion depth, 0 - maximum, 1 - one level (no recursion), etc.
	//   callback - preload finish
	//
	application.preloadDirectory = function(relPath, depth, callback) {
		var staticRx;
		if (application.config.files && application.config.files.staticRx) {
			staticRx = application.config.files.staticRx;
		}
		if (typeof(depth) === 'undefined') depth = 0;
		var absPath = application.hostDir+relPath;
		api.fs.readdir(absPath, function(err, files) {
			if (!err && files.length > 0) {
				api.async.each(files, function(fileName, cb) {
					var fileExt = impress.fileExt(fileName),
						filePath = trailingSlash(absPath)+fileName;
					api.fs.stat(filePath, function(err, stats) {
						if (!err) {
							if (stats.isDirectory() && (depth === 0 || depth>1)) {
								application.preloadDirectory(trailingSlash(relPath)+fileName, depth-1, cb);
							} else if (fileExt === 'js') {
								if (staticRx && staticRx.test(filePath)) cb();
								else application.createScript(null, filePath, cb);
							} else cb();
						} else cb();
					});
				}, function() {
					if (callback) callback();
				});
				impress.watchCache(application, trailingSlash(absPath));
			} else if (callback) callback();
		});
	};

	// Load configuration files
	//
	application.loadConfig = function(callback) {
		api.fs.readdir(application.configDir, function(err, files) {
			if (files) {
				files.sort(function(s1, s2) {
					var a = impress.configFilesPriority.indexOf(s1),
						b = impress.configFilesPriority.indexOf(s2);
					if (a === -1) a = Infinity;
					if (b === -1) b = Infinity;
					return (a < b) ? -1 : 1;
				});
				api.async.eachSeries(files, application.loadConfigFile, function() { callback(); });
			} else callback();
		});
		impress.watchCache(application, application.configDir+'/');
	};

	// Load single configuration file
	//
	application.loadConfigFile = function(file, callback) {
		var configFile = application.configDir+'/'+file,
			sectionName = api.path.basename(file, '.js');
		if (file.endsWith(".js")) {
			application.createScript(sectionName, configFile, function(err, key, exports) {
				application.config[key] = exports;
				if (key === 'databases' && global.db) db.openApplicationDatabases(application, callback);
				else callback();
			});
		} else if (file.endsWith(".json")) {
			sectionName = api.path.basename(sectionName, '.json');
			application.config[sectionName] = require(configFile);
			callback();
		} else callback();
	};

	// Preprocess application configuration
	//
	application.preprocessConfig = function() {
		var config = application.config;
		if (config.hosts) application.hostsRx = arrayRegExp(config.hosts);
		else if (application.log && application !== impress) application.log.error('Configuration error: empty or wrong hosts.js');
		if (config.files && config.files.static) config.files.staticRx = arrayRegExp(config.files.static);
		if (config.application) config.application.slowTime = duration(config.application.slowTime || impress.defaultSlowTime);
		if (config.cluster) {
			config.cluster.gc = duration(config.cluster.gc);
			if (config.cluster.cacheLimit) config.cluster.cacheLimit = sizeToBytes(config.cluster.cacheLimit);
			else config.cluster.cacheLimit = Infinity;
		}
		if (application !== impress) {
			var i;
			// Prepare plugins
			if (config.plugins) {
				var pluginName, plugin;
				for (i = 0; i < config.plugins.length; i++) {
					pluginName = config.plugins[i];
					plugin = impress.dataByPath(global, pluginName);
					if (plugin && plugin !== impress && plugin.mixinApplication) plugin.mixinApplication(application);
				}
			}
			// Prepare application routes
			if (config.routes) {
				var route, rx, routes = config.routes;
				for (i = 0; i < routes.length; i++) {
					route = routes[i];
					if (route.escaping === false) rx = route.url;
					else rx = '^'+route.url.replace(/(\/|\?|\.)/g, "\\$1").replace(/\(\\\.\*\)/, "(.*)")+'$';
					route.urlRx = new RegExp(rx);
					route.slowTime = duration(route.slowTime || impress.defaultSlowTime);
				}
			}
		}
	};

	// Load tasks
	//
	application.loadTasks = function() {
		api.fs.readdir(application.tasksDir, function(err, files) {
			if (files) api.async.each(files, application.loadTaskFile, function(err) { });
		});
		impress.watchCache(application, application.tasksDir+'/');
	};

	// Load and start single task file
	//
	application.loadTaskFile = function(file, callback) {
		var taskFile = application.tasksDir+'/'+file,
			sectionName = api.path.basename(file, '.js');
		if (file.endsWith(".js")) {
			application.createScript(sectionName, taskFile, function(err, key, exports) {
				application.setTask(key, exports);
				callback();
			});
		} else callback();
	};

	// Start or restart application tasks
	//
	application.setTask = function(taskName, exports) {
		application.stopTask(taskName);
		application.tasks[taskName] = exports;
		var task = application.tasks[taskName];
		if (task) {
			task.name      = taskName;
			task.success   = null;
			task.error     = null;
			task.lastStart = null;
			task.lastEnd   = null;
			task.executing = false;
			task.active    = false;
			task.count     = 0;
			application.startTask(taskName);
		}
	};

	// Start task
	//
	application.startTask = function(taskName) {
		var task = application.tasks[taskName];
		if (task && !task.active) {
			if ((api.cluster.isMaster && task.place === "master") ||
				(api.cluster.isWorker && task.place === "worker")
			) {
				task.active = true;
				task.interval = duration(task.interval);
				task.timer = setInterval(function() {
					if (!task.executing) {
						task.lastStart = new Date();
						task.executing = true;
						task.run(task, function(taskResult) {
							task.error = taskResult;
							task.success = taskResult === null;
							task.lastEnd = new Date();
							task.executing = false;
							task.count++;
						});
					}
				}, task.interval);
			}
		}	
	};

	// Stop task
	//
	application.stopTask = function(taskName) {
		var task = application.tasks[taskName];
		if (task && task.timer) clearInterval(task.timer);
		delete application.tasks[taskName];
	};

	// Stop application tasks
	//
	application.stopTasks = function() {
		var tasks = application.tasks;
		for (var taskName in tasks) application.stopTask(taskName);
	};

	// Log application error with stack trace
	//
	application.logException = function(err) {
		var path = impress.isWin ? __dirname.replace(/\//g, '\\')+'\\' : __dirname+'/',
			rxPath = new RegExp(escapeRegExp(path), 'g'),
			stack = err.stack.replace(rxPath, '').replace(/\n\s{4,}at/g, ';');
		if (application.log && application.log.error) application.log.error(stack);
		else console.log(stack);
	};

	// Create or clear application cache
	//
	application.clearCache = function() {
		application.config = {};
		if (application.cache) {
			var watcher;
			for (var watcherPath in application.cache.watchers) {
				watcher = application.cache.watchers[watcherPath];
				for (var i = 0; i < watcher.timers.length; i++) clearTimeout(watcher.timers[i]);
				watcher.close();
			}
		}
		application.cache = {
			templates: [], // template body cache indexed by file name
			files:     [], // file override/inherited cache indexed by file name
			folders:   [], // folder existence cache indexed by folder name
			scripts:   [], // compiled vm scripts
			watchers:  [], // directory watchers indexed by directory name
			static:    [], // static files cache
			pages:     [], // rendered pages cache
			size:      0   // cache size
		};
	};

	application.clearCache();
	application.createSandbox(callback);

}

// Load plugins
//
function loadPlugins() {
	if (impress.config.plugins) {
		if (api.cluster.isMaster && impress.config.plugins.indexOf("impress.log") === -1) {
			console.log('Warning: plugin impress.log.js is not included into config require section'.yellow.bold);
		}
		// Load plugins
		var pluginName, cache;
		for (var i = 0; i < impress.config.plugins.length; i++) {
			pluginName = './'+impress.config.plugins[i]+'.js';
			cache = require.cache[require.resolve(pluginName)];
			if (!cache) require(pluginName);
		}
	}
}

function compareMasks(m1, m2) {
	return (m1 === m2 || m1 === "*" || m2 === "*");
}

function compareHosts() {
	var cmp = [];
	for (var appName in impress.applications) {
		var config = impress.applications[appName].config;
		if (config) {
			var hosts = config.hosts;
			if (hosts) {
				var i;
				for (i = 0; i < hosts.length; i++) {
					for (var j = 0; j < cmp.length; j++) {
						if (compareMasks(hosts[i], cmp[j])) console.log(
							('  Hosts mask overlapping: "'+hosts[i]+'" and "'+cmp[j]+'"').red
						);
					}
				}
				for (i = 0; i < hosts.length; i++) {
					if (cmp.indexOf(hosts[i]) === -1 ) cmp.push(hosts[i]);
				}
			}
		}
	}
}

// Load applications
//
function loadApplications(callback) {
	api.fs.readdir(impress.applicationsDir, function(err, apps) {
		var cbCount = apps.length,
			cbIndex = 0,
			cb = function() {
				compareHosts();
				if (++cbIndex>=cbCount && callback) callback();
			},
			appName, appDir, stats, existsLink, linkFile, appLink;
		for (var i = 0; i < apps.length; i++) {
			appName = apps[i];
			appDir = impress.applicationsDir+'/'+appName;
			stats = api.fs.statSync(appDir);
			linkFile = appDir+'/application.link';
			existsLink = api.fs.existsSync(linkFile);
			if (existsLink) {
				appLink = api.fs.readFileSync(linkFile, 'utf8');
				appDir = impress.removeBOM(appLink);
			}
			(function() {
				if (stats.isDirectory() && (!impress.workerApplicationName || impress.workerApplicationName === appName)) {
					var application = new api.events.EventEmitter();
					application.Client = impress.createApplicationClientClass(application, {});
					extend(application, {
						name: appName,
						dir: appDir,
						hostDir: appDir+'/app',
						configDir: appDir+'/config',
						tasksDir: appDir+'/tasks',
						users: [],
						sessions: [] 
					});
					mixinApplication(application, function() {
						application.loadConfig(function() {
							impress.applications[application.name] = application;
							application.preprocessConfig();
							impress.log.init(application);
							application.log.open(cb);
							if (application.config.application && application.config.application.preload) application.preloadDirectory('/');
							application.loadTasks();
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
		impress.workerId = api.cluster.isMaster ? 0 : process.env['WORKER_ID'];
		impress.serverName = process.env['WORKER_SERVER_NAME'];
		if (api.cluster.isMaster) console.log('Impress Application Server'.bold.green+' starting, reading configuration'.green);
		impress.loadConfig(function() {
			impress.preprocessConfig();
			loadPlugins();
			if (impress.log) {
				impress.log.init(impress);
				impress.log.open(function() {
					if (impress.workerId === 'long') {
						impress.nodeId = impress.config.cluster.name+'L'+process.pid;
						impress.processMarker = 'Worker'+'('+impress.nodeId+')';
						impress.workerApplicationName = process.env["WORKER_APPNAME"];
						impress.workerApplicationFile = process.env["WORKER_FILE"];
						impress.workerApplicationClient = JSON.parse(process.env["WORKER_CLIENT"]);
					} else {
						impress.nodeId = impress.config.cluster.name+'N'+impress.workerId;
						process.title = 'impress'+(api.cluster.isMaster ? ' srv':' '+impress.nodeId);
						impress.processMarker = (api.cluster.isMaster ? 'Master':'Worker')+'('+process.pid+'/'+impress.nodeId+')';
					}
					if (api.cluster.isMaster && impress.config.cluster && impress.config.cluster.check) {
						console.log('Startup check: '.green+impress.config.cluster.check);
						api.http.get(impress.config.cluster.check, function(res) {
							if (res.statusCode === 404) startup();
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
				if (api.cluster.isMaster) {
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
				if (api.cms) cms.init();
			}
			// Set garbage collection interval
			if (typeof(global.gc) === 'function' && impress.config.cluster.gc > 0) {
				setInterval(function() {
					global.gc();
				}, impress.config.cluster.gc);
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
		cbIndex = 0,
		server;
	for (var serverName in servers) {
		server = servers[serverName];
		if (server.listener) server.listener.close(function() {
			if (++cbIndex>=cbCount && callback) {
				impress.clearCache();
				var application;
				for (var appName in impress.applications) {
					application = impress.applications[appName];
					application.stopTasks();
					application.clearCache();
				}
				callback();
			}
		}); else if (++cbIndex>=cbCount && callback) callback();
	}
};

// Reload configuration and restart server
//
impress.server.restart = function() {
	if (api.cluster.isMaster) console.log('Restarting...'.green);
	if (impress.config) impress.stop(function() {
		if (api.cluster.isMaster) console.log('  Reloading server configuration');
		impress.server.start();
	});
};

// Final shutdown
//
impress.shutdown = function() {
	if (api.cluster.isMaster) {
		impress.log.server('Stopped');
		impress.server.stop();
		var workerId;
		for (workerId = 0; workerId < impress.workers.length; workerId++) {
			impress.workers[workerId].kill();
		}
		for (workerId = 0; workerId < impress.longWorkers.length; workerId++) {
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
		workerId = 0,
		server, certificate, certDir;
	if (impress.config.cluster.strategy === "sticky" && impress.isWin) {
		impress.config.cluster.strategy = "single";
		if (master) console.log('Fallback to "single" strategy on windows, because "sticky" need named pipe'.red);
	}
	var single = impress.config.cluster.strategy === "single",
		specialization = impress.config.cluster.strategy === "specialization",
		cloned = impress.config.cluster.strategy === "multiple" || impress.config.cluster.strategy === "sticky",
		master = api.cluster.isMaster;

	for (var serverName in servers) {
		server = servers[serverName];
		certificate = null;

		if (server.protocol === "https") {
			if (server.key && server.cert) {
				certDir = impress.configDir+'/ssl/';
				certificate = {
					key:  api.fs.readFileSync(certDir+server.key),
					cert: api.fs.readFileSync(certDir+server.cert)
				};
			} else fatalError('SSL certificate is not configured for HTTPS');
		}
		if (master) {
			if (single) {
				if (server.protocol === "https")
					server.listener = api.https.createServer(certificate, impress.dispatcher);
				else server.listener = api.http.createServer(impress.dispatcher);
				if (impress.websocket) impress.websocket.upgradeServer(server.listener);
			} else if (cloned) {
				if (impress.config.cluster.strategy === "sticky")
					server.listener = api.net.createServer(balancer);
				else server.listener = {
					close: function(callback) { callback(); },
					on: function() { },
					listen: function() { }
				};
			} else if (specialization && isFirstStart) impress.forkWorker(workerId++, serverName);
			console.log('  listen on '+server.address+':'+server.port);
		} else if (cloned || impress.serverName === serverName) {
			if (server.protocol === "https")
				server.listener = api.https.createServer(certificate, impress.dispatcher);
			else server.listener = api.http.createServer(impress.dispatcher);
			if (impress.websocket) impress.websocket.upgradeServer(server.listener);
		}
		if (server.listener) {
			server.listener.slowTime = duration(server.slowTime || impress.defaultSlowTime);
			server.listener.on('error', function(e) {
				console.dir(e);
				if (e.code === 'EADDRINUSE' || e.code === 'EACCESS' || e.code === 'EACCES') fatalError('Can`t bind to host/port');
			});
			if (server.timeout && server.listener.timeout) {
				server.listener.timeout = duration(server.timeout);
			}
			server.listener.on('timeout', function(socket) {
				if (socket.client) socket.client.error(408, socket);
			});
			server.listener.serverName = serverName;
			if ((master && !specialization) || (!master && !cloned)) {
				if (server.nagle === false) {
					server.listener.on('connection', function(socket) {
						socket.setNoDelay();
					});
				}
				if (server.address === "*") server.listener.listen(server.port);
				else server.listener.listen(server.port, server.address);
			} else {
				if (impress.config.cluster.strategy === "sticky") server.listener.listen(null);
				else if (server.address === "*") server.listener.listen(server.port);
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

	if (api.cluster.isMaster) {
		impress.forkCount = 0;
		impress.workers = [];
		if (impress.config.cluster.strategy === "multiple" || impress.config.cluster.strategy === "sticky") {
			for (var workerId = 0; workerId < impress.config.cluster.workers; workerId++) {
				if (isFirstStart) impress.forkWorker(workerId);
			}
		}
	} else {
		process.on('message', function(message, socket) {
			if (message.name === 'impress:socket') {
				var server, servers = impress.config.servers;
				for (var serverName in servers) {
					server = servers[serverName];
					if (server.address === message.address && server.port === message.port) {
						socket.server = server.listener;
						server.listener.emit('connection', socket);
					}
				}
			} else if (impress.sse && message.name === 'impress:event') {
				// Retranslate events from master to worker
				var application = impress.applications[message.appName];
				if (application) {
					/**/ if (message.user)    application.events.sendToUser(message.user, message.event, message.data, true);
					else if (message.channel) application.events.sendToChannel(message.channel, message.event, message.data, true);
					else if (message.global)  application.events.sendGlobal(message.event, message.data, true);
				}
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
	worker = api.cluster.fork(env);
	worker.nodeId = impress.config.cluster.name+'N'+(workerId+1);
	worker.workerId = workerId;
	impress.workers[workerId] = worker;

	worker.on('exit', function(code, signal) {
		if (worker && !worker.suicide) {
			impress.stat.forkCount++;
			impress.forkWorker(workerId);
		}
	});
	impress.listenWorker(worker);
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
	var worker = api.cluster.fork(env);
	impress.listenWorker(worker);
	impress.longWorkers.push(worker);
};

// Initialize IPC for interprocess event routing, from worker to master
//   workerId
//
impress.listenWorker = function(worker) {
	worker.on('message', function(message) {
		if (message.name === 'impress:event') { // propagate to all workers except of original sender
			impress.stat.eventCount++;
			if (api.cluster.isMaster && impress.config.cloud && (impress.config.cloud.type === "server")) {
				impress.cloud.req.send(api.stringify(message));
			}
			for (var id = 0; id < impress.workers.length; id++) {
				if ((!worker.workerId || (id !== worker.workerId)) && impress.workers[id]) {
					impress.workers[id].send(message);
				}
			}
		} else if (message.name === 'impress:longworker') {
			impress.forkLongWorker(message.appName, message.workerFile, message.clientData);
		}
	});
}

// Dispatch requests
//
impress.dispatcher = function(req, res) {
	impress.stat.requestCount++;
	var isDispatched = false,
		staticRx = null,
		host = impress.parseHost(req.headers.host),
		application, client, route, match, urlRoute, form;
	for (var appName in impress.applications) {
		application = impress.applications[appName];
		if (application.hostsRx.test(host)) {
			client = new application.Client(application, req, res);
			client.application = application;
			client.accessLog();

			if (application.config.files.staticRx) staticRx = application.config.files.staticRx;
			if (application.config.application.slowTime) client.slowTime = application.config.application.slowTime;

			if (application.config.routes) {
				for (var iRoute = 0; iRoute < application.config.routes.length; iRoute++) {
					route = application.config.routes[iRoute];
					match = req.url.match(route.urlRx);
					if (match) {
						if (route.slowTime) client.slowTime = route.slowTime;
						urlRoute = req.url;
						if (route.rewrite && match.length > 1) {
							urlRoute = route.rewrite.replace(/\[([0-9]+)\]/g, function(s, key) {
								return match[key] || '';
							});
						} else urlRoute = route.rewrite;
						req.usedRoutes = req.usedRoutes || [];
						if (route.host) client.proxy(route.host, route.port || 80, urlRoute);
						else if (inArray(req.usedRoutes, iRoute)) client.error(508); else {
							req.url = urlRoute;
							req.usedRoutes.push(iRoute);
							impress.dispatcher(req, res);
						}
						return;
					}
				}
			}
			if (staticRx && staticRx.test(client.url)) client.static();
			else {
				if (impress.httpVerbs.indexOf(client.method) > 0) { // post, put, delete
					var contentType = req.headers['content-type'];
					if (contentType && contentType.startsWith('multipart')) {
						form = new api.multiparty.Form();
						form.parse(req, function(err, fields, files) {
							if (err) client.error(400);
							else {
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
							if (contentType && contentType.startsWith('application/json')) client.fields = JSON.parse(client.data);
							else client.fields = api.querystring.parse(client.data);
							client.restoreSession();
						});
					}
				} else client.restoreSession();
			}
			return;
		}
	}
	// No application detected to dispatch request to the host
	if (!isDispatched) {
		client = new impress.Client(impress, req, res);
		client.application = impress;
		client.accessLog();
		client.error(404);
	}
};

// Balancer for sticky mode
//
function balancer(socket) {
	var ip;
	if (impress.config.cluster.strategy === "sticky") ip = ip2int(socket.remoteAddress);
	else if (impress.config.cluster.strategy === "multiple") ip = ~~(Math.random()*impress.workers.length);

	var worker = impress.workers[Math.abs(ip) % impress.workers.length],
		server = impress.config.servers[socket.server.serverName];
	worker.send({ name: 'impress:socket', address: server.address, port: server.port }, socket);
}

// Refresh static in memory cache with compression and minification
//    required parameters: filePath, stats
//    optional parameters: client, httpCode
//
impress.compress = function(filePath, stats, application, client, httpCode) {
	api.fs.readFile(filePath, function(error, data) {
		if (error) {
			if (client) client.error(404);
		} else {
			var ext = client ? client.typeExt : impress.fileExt(filePath);
			if (ext === 'js' && application.config.files.minify) {
				data = impress.minify(data);
				stats.size = data.length;
			}
			if (!inArray(impress.compressedExt, ext) && stats.size>impress.compressAbove) {
				api.zlib.gzip(data, function(err, data) {
					stats.size = data.length;
					impress.compressSend(filePath, stats, application, client, httpCode, ext, true, data);
				});
			} else impress.compressSend(filePath, stats, application, client, httpCode, ext, false, data);
			impress.watchCache(application, filePath);
		}
	});
};

impress.compressSend = function(filePath, stats, application, client, httpCode, ext, compressed, data) {
	if (client) {
		client.res.writeHead(httpCode, impress.baseHeader(ext, stats, compressed));
		client.end(data);
	}
	application.cache.static[filePath] = { data:data, stats:stats, compressed:compressed };
	application.cache.size += data.length;
	if (application.cache.size > impress.config.cluster.cacheLimit) {
		for (var name in application.cache.static) {
			if (application.cache.static[name].data) {
				application.cache.size -= application.cache.static[name].data.length;
				delete application.cache.static[name];
				if (application.cache.size < impress.config.cluster.cacheLimit) return;
			}
		}
	}
};

// Send HTTP headers
//
impress.baseHeader = function(ext, stats, compressed) {
	compressed = typeof(compressed) !== 'undefined' ? compressed : false;
	var header = {
		'Content-Type': impress.mimeTypes[ext],
		'Cache-Control': 'public'
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
//   filePath - absolute path to file or directory to watch
//
impress.watchCache = function(application, filePath) {
	var watcher, path = filePath;
	if (!filePath.endsWith("/")) path = api.path.dirname(path)+"/";
	if (application) {
		watcher = application.cache.watchers[path];
		if (!watcher) {
			api.fs.exists(path, function(exists) {
				if (exists) {
					watcher = api.fs.watch(path, function(event, fileName) {
						var filePath = (fileName) ? path+fileName : path,
							ext = impress.fileExt(fileName),
							watcher = application.cache.watchers[path];
						if (watcher.timers[filePath]) clearTimeout(watcher.timers[filePath]);
						watcher.timers[filePath] = setTimeout(function() {
							api.fs.stat(filePath, function(err, stats) {
								if (err) return;
								if (stats.isFile()) {
									if (application.cache.static[filePath]) {
										// Replace static files memory cache
										api.fs.exists(filePath, function(exists) {
											if (exists) impress.compress(filePath, stats, application);
										});
									} else if (ext === 'js' && (filePath in application.cache.scripts)) {
										// Replace changed js file in cache
										api.fs.exists(filePath, function(exists) {
											if (exists) {
												application.cache.scripts[filePath] = null;
												application.createScript('', filePath, function(err, key, exports) {
													application.cache.scripts[filePath] = exports;
													var sectionName = api.path.basename(filePath, '.js');
													if (filePath.startsWith(application.configDir)) {
														// Reload config
														application.config[sectionName] = exports;
														application.preprocessConfig();
													} else if (filePath.startsWith(application.tasksDir)) {
														// Reload task
														application.setTask(sectionName, exports);
													}
												});
											} else {
												delete application.cache.scripts[filePath];
												var sectionName = api.path.basename(filePath, '.js');
												if (filePath.startsWith(application.configDir)) {
													delete application.config[sectionName]; // Remove config
												} else if (filePath.startsWith(application.tasksDir)) {
													application.stopTask(sectionName); // Remove task
												}
											}
										});
									} else if (ext === 'template') {
										// Replace changed template file in cache
										delete application.cache.templates[filePath];
										delete application.cache.files[filePath];
										api.fs.exists(filePath, function(exists) {
											if (exists) api.fs.readFile(filePath, 'utf8', function(err, tpl) {
												if (!err) {
													if (!tpl) tpl = impress.fileIsEmpty;
													else tpl = impress.removeBOM(tpl);
													application.cache.templates[filePath] = tpl;
													clearCacheStartingWith(application.cache.pages, path);
												}
											});
										});
									}
								} else {
									// Clear cache for all changed folders (created or deleted files)
									clearCacheStartingWith(application.cache.static, filePath);
									clearCacheStartingWith(application.cache.folders, filePath);
									clearCacheStartingWith(application.cache.pages, filePath);
									clearCacheStartingWith(application.cache.files, filePath, function(used) {
										var ext = impress.fileExt(used);
										if (ext === 'js' && (used in application.cache.scripts)) {
											delete application.cache.scripts[used];
										} else if (ext === 'template' && (used in application.cache.templates)) {
											delete application.cache.templates[used];
										}
									});
								}
							});
						}, 2000);
					});
					watcher.on('error', function() { watcher.close(); });
					watcher.timers = [];
					application.cache.watchers[path] = watcher;
				}
			});
		}
	}
};