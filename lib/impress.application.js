"use strict";

// Mixin application methods to given object
// Application should have:
//   .dir       - application root
//   .configDir - application configuration
//   .tasksDir  - application tasks (optional)
//   .initDir   - application initialization scripts directory (optional)
//
impress.mixinApplication = function(application, callback) {

	application.config = {};
	application.tasks = {};
	application.users = [];
	application.sessions = [];
	application.longWorkers = [];

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
		var sandbox = { module:{}, api:{}, initContext:impress.initContext };
		sandbox.global = sandbox;
		sandbox.application = application;
		application.sandbox = api.vm.createContext(sandbox);
		impress.mixinContextScript.runInNewContext(application.sandbox);
		application.loadConfigFile('sandbox.js', function() {
			if (application.config.sandbox) {
				var module, moduleName, i;
				var globals = application.config.sandbox.global || impress.defaultSandboxModules;
				for (i = 0; i < globals.length; i++) {
					moduleName = globals[i];
					if (moduleName === 'require') module = require;
					else if (moduleName === 'security') module = impress.security;
					else module = global[moduleName];
					if (module) application.sandbox[moduleName] = module;
				}
				var apis = application.config.sandbox.api || [];
				for (i = 0; i < apis.length; i++) {
					moduleName = apis[i];
					module = api[moduleName];
					if (module) application.sandbox.api[moduleName] = module;
				}
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
		if (config.hosts) application.hostsRx = impress.arrayRegExp(config.hosts);
		else if (application.log && application !== impress) application.log.error('Configuration error: empty or wrong hosts.js');
		if (config.files) {
			if (config.files.static) config.files.staticRx = impress.arrayRegExp(config.files.static);
			if (config.files.cacheSize) config.files.cacheSize = sizeToBytes(config.files.cacheSize);
			else config.files.cacheSize = Infinity;
			if (config.files.cacheMaxFileSize) config.files.cacheMaxFileSize = sizeToBytes(config.files.cacheMaxFileSize);
			else config.files.cacheMaxFileSize = Infinity;
		}
		if (config.application) config.application.slowTime = duration(config.application.slowTime || impress.defaultSlowTime);
		if (config.cluster) config.cluster.gc = duration(config.cluster.gc);
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

	// Load initialization scripts
	//   callback after all scripts loaded
	//
	application.loadInitScripts = function(callback) {
		api.fs.exists(application.initDir, function (exists) {
			if (exists) {
				api.fs.readdir(application.initDir, function(err, files) {
					if (files) api.async.each(files, application.loadInitFile, function(err) {
						if (callback) callback();
					});
				});
				impress.watchCache(application, application.initDir+'/');
			} else if (callback) callback();
		});
	};

	// Load single initialization script file
	//
	application.loadInitFile = function(file, callback) {
		var taskFile = application.initDir+'/'+file,
			sectionName = api.path.basename(file, '.js');
		if (file.endsWith(".js")) {
			application.createScript(sectionName, taskFile, function(err, key, exports) {
				callback();
			});
		} else callback();
	};

	// Load tasks
	//
	application.loadTasks = function() {
		api.fs.exists(application.initDir, function (exists) {
			if (exists) {
				api.fs.readdir(application.tasksDir, function(err, files) {
					if (files) api.async.each(files, application.loadTaskFile, function(err) { });
				});
				impress.watchCache(application, application.tasksDir+'/');
			}
		});
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

	// Purge application cache
	//
	application.purgeCache = function() {
		if (application.cache.size > application.config.files.cacheSize) {
			for (var name in application.cache.static) {
				if (application.cache.static[name].data) {
					application.cache.size -= application.cache.static[name].data.length;
					delete application.cache.static[name];
					if (application.cache.size < application.config.files.cacheSize) return;
				}
			}
		}
	};

	// Refresh static in memory cache with compression and minification
	//   callback(err, data, compressed)
	//
	application.compress = function(filePath, stats, callback) {
		api.fs.readFile(filePath, function(error, data) {
			if (error) {
				if (callback) callback(err);
			} else {
				var ext = impress.fileExt(filePath);
				if (ext === 'js' && application.config.files.minify) {
					data = impress.minify(data);
					stats.size = data.length;
				}
				if (!inArray(impress.compressedExt, ext) && stats.size>impress.compressAbove) {
					api.zlib.gzip(data, function(err, data) {
						if (!err) stats.size = data.length;
						if (callback) callback(err, data, true);
						if (!err) application.addToCache(filePath, stats, true, data);
					});
				} else {
					if (callback) callback(null, data, false);
					application.addToCache(filePath, stats, false, data);
				}
				impress.watchCache(application, filePath);
			}
		});
	};

	// Add static to cache
	//
	application.addToCache = function(filePath, stats, compressed, data) {
		application.cache.static[filePath] = { data:data, stats:stats, compressed:compressed };
		application.cache.size += data.length;
		application.purgeCache();
	};

	// Shutdown application
	//
	application.shutdownLongWorkers = function() {
		for (var id = 0; id < application.longWorkers.length; id++) {
			application.longWorkers[id].kill();
		}
	};

	application.clearCache();
	application.createSandbox(callback);

};
