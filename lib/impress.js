(function(impress) {

	require('./global');
	require('./impress.constants');

	impress.isMainApplication = true;
	impress.isWin = !!process.platform.match(/^win/);
	impress.dir = process.cwd().replace(/\\/g, '/');
	impress.applicationsDir = impress.dir+'/applications';

	// Node.js internal modules
	//
	impress.os = require('os');
	impress.vm = require('vm');
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

	function logException(err) {
		var message = err.toString(),
			path = impress.isWin ? impress.dir.replace(/\//g, '\\') : impress.dir,
			rxPath = new RegExp(escapeRegExp(path), 'g'),
			stack = (impress.cluster.isMaster ? 'Master':'Worker')+'('+process.pid+'/'+impress.nodeId+')\t'+err.stack.replace(rxPath, '');
		if (impress.cluster.isMaster) console.log('Exception in master process'.red);
		if (impress.log) {
			stack = stack.replace(/\n\s{4,}at/g, ';');
			impress.log.error(stack);
		} else console.log(stack);
	};

	process.on('uncaughtException', function(err) {
		logException(err);
		impress.shutdown();
	});

	// Impress safe require
	//
	impress.require = function(moduleName) {
		var lib = null;
		try { lib = require(moduleName); } catch(err) {}
		if (impress.cluster.isMaster && lib == null) {
			console.log(
				'Warning: module '+moduleName+' is not installed\n'.yellow.bold+
				'  You need to install it using '+('npm install '+moduleName).bold+' or disable in config\n'
			);
		}
		return lib;
	}

	impress.stat = {
		spawnCount: 0,
		eventCount: 0,
		requestCount:  0,
		responseCount: 0
	}

	impress.applications = {};
	impress.server = new impress.events.EventEmitter;
	impress.configDir = impress.dir+'/config';

	// Mixin application methods to given object
	// Application should have:
	//   .dir       - application root
	//   .configDir - application configuration
	//
	function mixinApplication(application) {

		// Сompile, execute and save script exports to cache or get exports from cache,
		//   callback(err, exports), where exports - function or object exported from script
		//
		application.createScript = function(key, fileName, callback) {
			var application = this,
				exports = application.cache.scripts[fileName];
			if (exports) callback(null, key, exports);
			else {
				impress.fs.readFile(fileName, function(err, code) {
					if (!err) {
						var scriptName = fileName.replace(application.isMainApplication ? impress.dir : impress.applicationsDir, ''),
							script = impress.vm.createScript(code, scriptName);
						exports = script.runInNewContext(application.sandbox);
						application.cache.scripts[fileName] = exports;
					}
					callback(null, key, exports);
				});
			}
		}

		// Run script in application context
		//
		application.runScript = function(fileName, req, res, callback) {
			this.createScript(null, fileName, function(err, key, fn) {
				if (typeof(fn) == 'function') {
					var executionDomain = impress.domain.create();
					executionDomain.on('error', function(err) {
						impress.error(req, res, 500);
						logException(err);
						callback();
					});
					executionDomain.run(function() {
						fn(req, res, callback);
					});
				} else callback();
			});
		}

		// Create application sandbox
		//
		application.createSandbox = function() {
			var sandbox = { module:{} },
				modules = (impress.config && impress.config.sandbox) ? impress.config.sandbox.modules : impress.defaultSandboxModules;
			for (var i = 0; i < modules.length; i++) {
				var moduleName = modules[i],
					module = impress[moduleName];
				if (!module) module = global[moduleName];
				if (module) sandbox[moduleName] = module;
			}
			sandbox.application = this;
			this.sandbox = impress.vm.createContext(sandbox);
		}

		// Load configuration files
		//
		application.loadConfig = function(callback) {
			var applicaion = this;
			applicaion.config = {};
			impress.fs.readdir(applicaion.configDir, function(err, files) {
				var cbCount = Object.keys(files).length,
					cbIndex = 0;
				for (var i in files) {
					var file = files[i],
						configFile = applicaion.configDir+'/'+file;
					if (file.indexOf(".js") != -1) {
						var sectionName = file.replace('.js', '');
						application.createScript(sectionName, configFile, function(err, key, exports) {
							application.config[key] = exports;
							if (++cbIndex>=cbCount && callback) callback();
						});
					} else if (++cbIndex>=cbCount && callback) callback();
				}
			});
			watchCache(application, applicaion.configDir);
		}

		// Create or clear application cache
		//
		application.clearCache = function() {
			this.cache = {
				templates: [], // template body cache indexed by file name
				files:     [], // file override/inherited cache indexed by file name
				scripts:   [], // compiled vm scripts
				watchers:  [], // directory watchers indexed by directory name
				static:    [], // static files cache
				pages:     []  // rendered pages cache
			}
		}
		application.clearCache();
	}

	mixinApplication(impress);
	impress.createSandbox();

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
			// TODO: Plugins unloading (removed from this implementation)
		}
	}

	// Load applications
	//
	function loadApplications(callback) {
		impress.fs.readdir(impress.applicationsDir, function(err, apps) {
			var cbCount = Object.keys(apps).length,
				cbIndex = 0;
			for (var i in apps) {
				var appName = apps[i],
					appDir = impress.applicationsDir+'/'+appName,
					stats = impress.fs.lstatSync(appDir);
				if (stats.isDirectory()) {
					var application = new impress.events.EventEmitter;
					extend(application, {name:appName, dir:appDir, configDir:appDir+'/config'});
					mixinApplication(application);

					application.createSandbox();
					application.loadConfig(function() {
						var config = application.config;
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

						impress.applications[appName] = application;
						if (global.db) db.openApplicationDatabases(application, function() {
							if (++cbIndex>=cbCount && callback) callback();
						}); else if (++cbIndex>=cbCount && callback) callback();
					});
				} else if (++cbIndex>=cbCount && callback) callback();
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
		impress.workerId = impress.cluster.isMaster ? 0 : process.env['WORKER_ID'];
		impress.serverName = process.env['WORKER_SERVER_NAME'];
		process.title = impress.processTitle;
		if (impress.cluster.isMaster) console.log('Impress Application Server starting'.bold.green+', reading configuration'.green);
		impress.loadConfig(function() {
			loadPlugins();
			if (impress.log) impress.log.open();
			impress.nodeId = impress.config.cluster.name+'N'+impress.workerId;

			if (impress.cluster.isMaster && impress.config.cluster && impress.config.cluster.check) {
				console.log('Startup check: '.green+impress.config.cluster.check);
				impress.http.get(impress.config.cluster.check, function(res) {
					if (res.statusCode == 404) startup();
					else fatalError('Status: server is already started');
				}).on('error', startup);
			} else startup();
		});

		function startup() {
			startWorkers();
			loadApplications(function() {
				impress.server.emit("start");
				if (impress.cluster.isMaster) impress.server.emit("master"); else impress.server.emit("worker");
			});
			startServers();

			if (impress.health) impress.health.init();
			if (impress.cloud)  impress.cloud.init();
			//if (global.cms && db.system) cms.init(db.system);

			// Set garbage collection interval
			var gcInterval = duration(impress.config.cluster.gc);
			if (typeof(global.gc) === 'function' && gcInterval > 0) {
				setInterval(function() {
					global.gc();
				}, gcInterval*1000);
			}
			isFirstStart = false;
		}
	}

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
					for (var sectionName in impress.config) {
						var section = impress.config[sectionName];
						// delete require.cache[require.resolve(section.configFile)]; !!!
					}
					delete impress.config;

					// Unwatch folders and clear cache
					for (var watcherPath in impress.cache.watchers) {
						var watcher = impress.cache.watchers[watcherPath];
						for (var key in watcher.timers) clearTimeout(watcher.timers[key]);
						watcher.close();
					}

					for (var appName in impress.applications) {
						var application = impress.applications[appName];
						application.clearCache();
					}

					callback();
				}
			});
		}
	}

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
	}

	// Final shutdown
	//
	impress.shutdown = function() {
		impress.server.stop();
		// Stop workers
		if (impress.cluster.isMaster && impress.workers) {
			for (var workerId = 0; workerId < impress.workers.length; workerId++) {
				impress.workers[workerId].kill();
			}
		}
		if (impress.log) impress.log.close();
		setTimeout(function() {
			if (impress.cluster.isMaster) console.log('Impress shutting down'.bold.green);
			process.exit(0);
		}, 500);
	}

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
			server.slowTime = duration(server.slowTime || impress.defaultSlowTime);

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
				console.log('  listen on '+server.address+':'+server.port);
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
				} else if (specialization && isFirstStart) impress.spawn(workerId++, serverName);
			} else if (cloned || impress.serverName == serverName) {
				if (server.protocol == "https")
					server.listener = impress.https.createServer(certificate, impress.dispatcher);
				else server.listener = impress.http.createServer(impress.dispatcher);
				if (impress.websocket) impress.websocket.upgradeServer(server.listener);
			}
			if (server.listener) {
				server.listener.on('error', function(e) {
					if (e.code == 'EADDRINUSE' || e.code == 'EACCESS') fatalError('Can`t bind to host/port');
				});
				server.listener.serverName = serverName;
				if ((master && !specialization) || (!master && !cloned)) {
					if (server.nagle == false) {
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
		if (impress.cluster.isMaster) {
			impress.spawnCount = 0;
			impress.workers = [];
			if (impress.config.cluster.strategy == "multiple" || impress.config.cluster.strategy == "sticky") {
				for (var workerId = 0; workerId < impress.config.cluster.workers; workerId++) {
					if (isFirstStart) impress.spawn(workerId);
				}
			}
			process.on('SIGINT', impress.shutdown);
			process.on('SIGTERM', impress.shutdown);
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
					if (message.user) impress.sse.sendToUser(message.user, message.event, message.data, true);
					else if (message.channel) impress.sse.sendToChannel(message.channel, message.event, message.data, true);
					else if (message.global) impress.sse.sendGlobal(message.event, message.data, true);
				}
			});
		}
	}

	// Spawn new worker
	// bind worker to serverName from config if serverName defined
	//
	impress.spawn = function(workerId, serverName) {
		var worker, env = {};
		env["WORKER_ID"] = workerId+1;
		if (typeof(serverName) !== "undefined") env["WORKER_SERVER_NAME"] = serverName;
		var worker = impress.cluster.fork(env);
		worker.nodeId = impress.config.cluster.name+'N'+(workerId+1);
		impress.workers[workerId] = worker;

		worker.on('exit', function(code, signal) {
			if (worker && !worker.suicide) {
				impress.stat.spawnCount++;
				impress.spawn(workerId);
			}
		});
	
		// Initialize IPC for interprocess event routing, from worker to master
		worker.on('message', function(msg) {
			if (msg.name == 'impress:event') { // propagate to all workers except of original sender
				impress.stat.eventCount++;
				if (impress.cluster.isMaster && impress.config.cloud && (impress.config.cloud.type == "server")) {
					impress.cloud.req.send(JSON.stringify(msg));
				}
				for (var id = 0; id < impress.workers.length; id++) {
					if ((id != workerId) && impress.workers[id]) impress.workers[id].send(msg);
				}
			}
		});
	}

	// Dispatch requests
	//
	impress.dispatcher = function(req, res) {
		impress.stat.requestCount++;
		// Prepare impress structures
		var impressInstance = {};
		req.impress = impressInstance;
		res.impress = impressInstance;
		req.impress.startTime = new Date().getTime();
		req.impress.access = clone(impress.defaultAccess);

		var server = (req.connection.server)
				? impress.config.servers[req.connection.server.serverName]
				: impress.config.servers[req.connection.pair.server.serverName],
			url = impress.url.parse(req.url);
		req.query = impress.querystring.parse(url.query);
		req.impress.schema = (!req.connection.server) ? "https" : "http";
		req.impress.url = url.pathname,
		req.impress.path = req.impress.url,
		req.impress.ext = fileExt(req.impress.url) || 'html';
		if (!req.headers.host) req.headers.host = 'no-host-name-in-http-headers';

		req.impress.slowTime = server.slowTime;
		if (impress.log) impress.log.access(
			req.connection.remoteAddress+'\t'+
			req.method+'\t'+
			req.impress.schema+'://'+req.headers.host+req.impress.url+'\t'+
			req.headers['user-agent']
		);
		
		var isDispatched = false,
			isRouted = false,
			portOffset = req.headers.host.indexOf(':'),
			staticRx = null;
		req.impress.host = (portOffset >= 0) ? req.headers.host.substr(0, portOffset) : req.headers.host;

		for (var appName in impress.applications) {
			var application = impress.applications[appName];
			if (application.hostsRx.test(req.impress.host)) {
				//console.log('---APP:'+appName);
				req.impress.application = application;
				if (application.config.files.staticRx) staticRx = application.config.files.staticRx;
				if (application.config.application.slowTime) req.impress.slowTime = application.config.application.slowTime;
				req.impress.hostDir = application.dir+'/app';
				if (staticRx && staticRx.test(req.impress.url)) {
					static(req, res);
					return;
				} else {
					if (application.config.routes) {
						for (var iRoute = 0; iRoute < application.config.routes.length; ++iRoute) {
							var route = application.config.routes[iRoute],
								match = req.url.match(route.urlRx);
							if (match) {
								//console.log('---ROUTE:');
								if (route.slowTime) req.impress.slowTime = route.slowTime;
								var urlRoute = req.url;
								if (route.rewrite && match.length > 1) {
									urlRoute = route.rewrite.replace(/\[([0-9]+)\]/g, function(s, key) {
										return match[key] || s;
									});
								} else urlRoute = route.rewrite;
								if (route.host) {
									proxy(req, res, route.host, route.port || 80, urlRoute);
								} else {
									// TODO: here we should handle internal redirect
								}
								return;
							}
						}
						//if (!isRouted) impress.error(req, res, 404);
					}
					// Read POST parameters
					if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
						var contentType = req.headers['content-type'];
						if (contentType && contentType.startsWith('multipart')) {
							var form = new impress.multiparty.Form();
							form.parse(req, function(err, fields, files) {
								if (err) {
									impress.error(req, res, 400);
									return;
								} else {
									req.impress.files = files;
									req.impress.fields = fields;
									restoreSession(req, res);
								}
							});
						} else {
							req.impress.data = "";
							req.on("data", function(chunk) {
								req.impress.data += chunk;
							});
							req.on("end", function() {
								req.post = impress.querystring.parse(req.impress.data);
								restoreSession(req, res);
							});
						}
					} else restoreSession(req, res);
					return;
				}
			}
		}
		if (!isDispatched) impress.error(req, res, 404);
	}
	
	// Start session
	//
	impress.startSession = function(req, res) {
		if (!req.impress.session) {
			var sid = impress.generateSID(req.impress.application.config);
			req.impress.session = sid;
			req.impress.user = {};
			impress.setCookie(req, res, req.impress.application.config.sessions.cookie, sid);
			if (impress.config.cluster.cookie) impress.setCookie(req, res, impress.config.cluster.cookie, impress.nodeId);
			impress.sessions[sid] = {
				sessionModified: true,
				sessionCreated: true
			};
		}
	}

	// Destroy session
	//
	impress.destroySession = function(req, res) {
		if (req.impress.session) {
			impress.deleteCookie(req, res, req.impress.application.config.sessions.cookie);
			impress.deleteCookie(req, res, impress.config.cluster.cookie);
			// clear other structures
			var userId = impress.sessions[req.impress.session].userId;
			if (userId && impress.users[userId]) delete impress.users[userId].sessions[req.impress.session];
			delete impress.sessions[req.impress.session];
			req.impress.session = null;
			req.impress.user = null;
			// !!! delete session from MongoDB persistent session storage
			if (impress.security) impress.security.deletePersistentSession(req.impress.session);
		};
	}

	// Set cookie name=value, host is optional
	//
	impress.setCookie = function(req, res, name, value, host) {
		var expires = new Date(2100,01,01).toUTCString(),
			host = host || req.headers.host;
		res.impress.cookies.push(name+"="+value+"; expires="+expires+"; Path=/; Domain="+host+"; HttpOnly");
	}

	// Delete cookie by name
	//
	impress.deleteCookie = function(req, res, name) {
		res.impress.cookies.push(name+"=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain=."+req.headers.host);
	}

	// Send cookies prepared in res.impress.cookies
	//
	impress.sendCookie = function(req, res) {
		if (res.impress.cookies && res.impress.cookies.length && !res.headersSent) {
			res.setHeader("Set-Cookie", res.impress.cookies);
		}
	}

	// Generate SID
	//
	impress.generateSID = function(config) {
		var key = generateKey(
			config.sessions.length-2,
			config.sessions.characters
		);
		return key+impress.crcSID(config, key);
	}

	// Calculate SID CRC
	//
	impress.crcSID = function(config, key) {
		var c1 = key.indexOf(key.charAt(key.length-1)),
			c2 = key.indexOf(key.charAt(key.length-2)),
			s1 = config.sessions.characters.charAt(c1),
			s2 = config.sessions.characters.charAt(c2);
		return s1+s2;
	}

	// Validate SID
	//
	impress.validateSID = function(config, sid) {
		if (!sid) return false;
		var crc = sid.substr(sid.length-2),
			key = sid.substr(0, sid.length-2);
		return impress.crcSID(config, key) == crc;
	}

	// Balancer for sticky mode
	//
	function balancer(socket) {
		var ip;
		if (impress.config.cluster.strategy == "sticky") ip = ip2int(socket.remoteAddress);
		else if (impress.config.cluster.strategy == "multiple") ip = ~~(Math.random()*impress.workers.length);

		var worker = impress.workers[Math.abs(ip) % impress.workers.length],
			server = impress.config.servers[socket.server.serverName];
		worker.send({
			name: 'impress:socket',
			address: server.address,
			port: server.port
		}, socket);
	}

	// Route request to external HTTP server
	//
	function proxy(req, res, host, port, url) {
		impress.http.request({
			host: host,
			port: port,
			path: url,
			method: req.method
		},
		function(response) {
			res.writeHead(response.statusCode, response.headers);
			response.on('data', function(chunk) { res.write(chunk); });
			response.on('end', function() { res.end(); });
		}).on("error", function(err) {
			impress.error(req, res, 502);
		})
		.end();
		impress.stat.responseCount++;
	}

	// Restore session if available
	//
	function restoreSession(req, res) {
		// Parse cookies
		req.impress.cookies = [];
		res.impress.cookies = [];
		if (req.headers.cookie) req.headers.cookie.split(';').forEach(function(cookie) {
			var parts = cookie.split('=');
			req.impress.cookies[parts[0].trim()] = (parts[1] || '').trim();
		});
		// Detect session, restore session or delete cookie
		var sid = req.impress.cookies[req.impress.application.config.sessions.cookie];
		if (sid) {
			if (impress.validateSID(req.impress.application.config, sid)) {
				if (impress.security && impress.sessions[sid]) {
					req.impress.session = sid;
					req.impress.logged = !!impress.sessions[sid].userId;
					if (impress.security) req.impress.user = impress.security.getSessionUser(sid);
					processing(req, res);
				} else {
					if (req.impress.application.config.sessions.persist && impress.security) {
						impress.security.restorePersistentSession(sid, function(err, session) {
							if (session) {
								var userId = session.userId;
								req.impress.session = sid;
								req.impress.user = impress.security.getSessionUser(sid);
								req.impress.logged = !!userId;
							} else impress.deleteCookie(req, res, req.impress.application.config.sessions.cookie);
							processing(req, res);
						});
					} else processing(req, res);
				}
			} else {
				impress.deleteCookie(req, res, req.impress.application.config.sessions.cookie);
				processing(req, res);
			}
		} else processing(req, res);
	}

	// Save session
	//
	function saveSession(req, res, callback) {
		if (req.impress.session && req.impress.application.config.sessions.persist && impress.security) {
			var session = impress.sessions[req.impress.session];
			if (session && (session.sessionCreated || session.sessionModified))
				impress.security.savePersistentSession(req.impress.session, callback);
			else callback();
		} else callback();
	}

	// Process request by impress.js
	//
	function processing(req, res) {
		var application = req.impress.application;
		req.impress.handlers = ['access', 'request', req.method.toLowerCase()];
		res.context = {};

		// Set Content-Type if detected and not SSE
		if (req.impress.ext == 'sse') res.sse = { channel: null };
		else if (req.impress.ext != 'ws') {
			var contentType = impress.mimeTypes[req.impress.ext];
			if (contentType && res.setHeader) res.setHeader('Content-Type', contentType);
		}

		// Execute handlers
		impress.async.eachSeries(req.impress.handlers, function(handler, callback) {
			req.impress.path = req.impress.url;
			filehandler(req, res, handler, callback);
		}, function(err) {
			req.impress.path = req.impress.url;
			if (req.impress.access.allowed) {
				if (req.impress.ext == 'html' || req.impress.ext == 'ajax') {
					var filePath = req.impress.hostDir+req.impress.path,
						buffer = application.cache.pages[filePath];
					if (buffer) { res.end(buffer); impress.stat.responseCount++; }
					else if (global.cms) cms.processing(req, res, processingPage);
					else processingPage(req, res);
				} else if (req.impress.ext == 'sse') {
					if (impress.sse) impress.sse.connect(req, res);
					else impress.error(req, res, 510);
				} else if (req.impress.ext == 'ws') {
					if (impress.websocket) impress.websocket.finalize(req, res);
					else impress.error(req, res, 510);
				} else if (req.impress.ext == 'json') {
					var output = JSON.stringify(res.context.data);
					if (!output) impress.error(req, res, 404);
					else { impress.end(req, res, output); impress.stat.responseCount++; }
				} else impress.error(req, res, 404);
			} else impress.error(req, res, 403);
		});
	}

	// Process dynamic and static pages, cms pages
	// TODO: implement CMS here
	// 
	function processingPage(req, res) {
		var application = req.impress.application,
			data = res.context.data || {};
		impress.template(req, res, data, 'html', '', function(tpl) {
			if (res.impress.cachable) {
				var filePath = req.impress.hostDir+req.impress.path;
				application.cache.pages[filePath] = tpl;
			}
			impress.end(req, res, tpl);
		});
	}
	
	// End request
	//
	impress.end = function(req, res, output) {
		saveSession(req, res, function() {
			impress.sendCookie(req, res);
			req.impress.endTime = new Date().getTime();
			res.end(output);
			if (impress.log && req.impress.endTime-req.impress.startTime >= req.impress.slowTime) impress.log.slow(
				(req.impress.endTime-req.impress.startTime)+'ms\t'+
				req.connection.remoteAddress+'\t'+
				req.method+'\t'+
				req.impress.schema+'://'+req.headers.host+req.impress.url+'\t'+
				req.headers['user-agent']
			);
			impress.stat.responseCount++;
		});
	}

	// End request with HTTP error code
	//
	impress.error = function(req, res, code) {
		if (code==304) {
			res.statusCode = code;
			impress.end(req, res);
		} else {
			if (res.setHeader) res.setHeader('Content-Type', impress.mimeTypes['html']);
			res.statusCode = code;
			var message = impress.httpErrorCodes[code] || 'Unknown error';
			impress.include(req, res, {title: "Error "+code, message: message}, __dirname+'/error.template', '', function(tpl) {
				impress.end(req, res, tpl);
			});
		}
		impress.stat.responseCount++;
	}

	// Find existent file to execute
	//
	function filehandler(req, res, file, callback) {
		var application = req.impress.application,
			fileName = file+'.js',
			filePath = req.impress.hostDir+lastSlash(req.impress.path)+fileName,
			fileExecute = application.cache.files[filePath];
		if (fileExecute) {
			if (fileExecute != impress.fileNotFound) execute(req, res, fileExecute, callback);
			else impress.error(req, res, 404);
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				execute(req, res, filePath, callback);
				var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
				application.cache.files[fileOriginal] = filePath;
				watchCache(application, fileOriginal);
			} else {
				// Try to process request on parent directory
				if ((req.impress.path != '/') && (req.impress.path != '.')) {
					req.impress.path = impress.path.dirname(req.impress.path);
					filehandler(req, res, file, callback);
					var path = req.impress.path,
						path = req.impress.hostDir+path+(path.endsWith("/") ? "" : "/");
					watchCache(application, path);
				} else {
					// If last file in array
					// if (file == req.method.toLowerCase()) res.write('No handler found');
					// Lose hope to execute request and drop connection
					impress.error(req, res, 404);
					//callback();
					var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
					application.cache.files[fileOriginal] = impress.fileNotFound;
					watchCache(application, fileOriginal);
				}
			}
		});
	}

	// Execute existent file from cache or disk
	//
	function execute(req, res, filePath, callback) {
		req.impress.access.allowed = (
			(
				(!req.impress.logged && req.impress.access.guests) ||
				(!!req.impress.logged && req.impress.access.logged)
			) && (
				(!!req.connection.server && req.impress.access.http) ||
				(!req.connection.server && req.impress.access.https)
			)
		);
		if (req.impress.logged) {
			req.impress.access.allowed = req.impress.access.allowed && (
				(!req.impress.access.groups) ||
				(req.impress.access.groups &&
					(
						req.impress.access.groups.length==0 ||
						inArray(req.impress.access.groups, req.impress.user.group)
					)
				)
			);
		}
		if (req.impress.access.allowed) req.impress.application.runScript(filePath, req, res, callback);
		else callback();
	}

	// Render template from file or cache
	//
	impress.template = function(req, res, data, file, cursor, callback) { // callback(tpl)
		var application = req.impress.application,
			userGroup = '';
		if (req.impress.logged) userGroup = '.'+(req.impress.user.group || 'everyone');
		var fileName = file+userGroup+'.template',
			filePath = req.impress.hostDir+lastSlash(req.impress.path)+fileName,
			fileInclude = application.cache.files[filePath];
		if (fileInclude) {
			if (fileInclude != impress.fileNotFound) impress.include(req, res, data, fileInclude, cursor, callback);
			else callback(impress.templateNotFound+file);
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				impress.include(req, res, data, filePath, cursor, callback);
				var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
				application.cache.files[fileOriginal] = filePath;
				watchCache(application, fileOriginal);
			} else {
				// Try to find template without group name
				fileName = file+'.template',
				filePath = req.impress.hostDir+lastSlash(req.impress.path)+fileName;
				fileInclude = application.cache.files[filePath];
				if (fileInclude) {
					if (fileInclude != impress.fileNotFound) impress.include(req, res, data, fileInclude, cursor, callback);
					else callback(impress.templateNotFound+file);
				} else impress.fs.exists(filePath, function(exists) {
					if (exists) {
						impress.include(req, res, data, filePath, cursor, callback);
						var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
						application.cache.files[fileOriginal] = filePath;
						watchCache(application, fileOriginal);
					} else {
						// Try to find template in parent directory
						if ((req.impress.path != '/') && (req.impress.path != '.')) {
							req.impress.path = impress.path.dirname(req.impress.path);
							impress.template(req, res, data, file, cursor, callback);
							var path = req.impress.path,
								path = req.impress.hostDir+path+(path.endsWith("/") ? "" : "/");
							watchCache(application, path);
						} else {
							// Lose hope to fine template and save cache
							var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
							application.cache.files[fileOriginal] = impress.fileNotFound;
							watchCache(application, fileOriginal);
							callback(impress.templateNotFound+file);
						}
					}
				});
			}
		});
	}

	// Include template
	//
	impress.include = function(req, res, data, filePath, cursor, callback) { // callback(tpl)
		var application = req.impress.application,
			cache = application.cache.templates[filePath];
		if (cache) {
			if (cache != impress.fileIsEmpty) impress.render(req, res, data, cache, cursor, callback);
			else callback(impress.fileIsEmpty);
		} else {
			impress.fs.readFile(filePath, 'utf8', function(err, tpl) {
				if (err) callback(impress.templateNotFound+filePath);
				else {
					if (!tpl) tpl = impress.fileIsEmpty; else {
						tpl = tpl.replace(/^[\uBBBF\uFEFF]/, '');
						if (!tpl) tpl = impress.fileIsEmpty;
					}
					application.cache.templates[filePath] = tpl;
					impress.render(req, res, data, tpl, cursor, callback);
				}
			});
			watchCache(application, filePath);
		}
	}

	// Render template from variable
	//
	impress.render = function(req, res, data, tpl, cursor, callback) { // callback(tpl)
		// parse template into structure
		if (tpl != impress.fileIsEmpty) {
			var structure = [],
				pos, tplBefore, tplInclude, dataInclude, dataItem, tplBody, arrayIndex;
			while (tpl.length>0) {
				// get tpl before includes
				pos = tpl.indexOf("@[");
				if (pos >= 0) {
					structure.push({ type:'plain', tpl:tpl.substr(0, pos) });
					tpl = tpl.substring(pos+2);
					// get include name
					pos = tpl.indexOf("]@");
					tplInclude = tpl.substr(0, pos);
					tpl = tpl.substring(pos+2);
					dataInclude = impress.value(data,(cursor ? cursor+'.' : '')+tplInclude);
					// find inline templates
					pos = tpl.indexOf("@[/"+tplInclude+"]@");
					arrayIndex = 0;
					if (pos >= 0) {
						tplBody = tpl.substr(0, pos);
						if (Array.isArray(dataInclude)) for (var dataItem in dataInclude) structure.push({
							type:'inline', name:tplInclude+'.'+arrayIndex++, tpl:tplBody
						}); else structure.push({ type:'inline', name:tplInclude, tpl:tplBody });
						tpl = tpl.substring(pos+5+tplInclude.length);
					} else {
						// handle included templates
						if (Array.isArray(dataInclude)) for (var dataItem in dataInclude) structure.push({
							type:'include', name:tplInclude+'.'+arrayIndex++
						}); else structure.push({ type:'include', name:tplInclude });
					}
				} else {
					structure.push({ type:'plain', tpl:tpl });
					tpl = '';
				}
			}
			// generate result from structure
			var result = '';
			impress.async.eachSeries(structure, function(item, callback) {
				if (item.type == 'plain') {
					result += impress.subst(item.tpl, data, cursor);
					callback();
				} else if (item.type == 'inline') {
					var cursorNew = (cursor == "") ? item.name : cursor+"."+item.name;
					impress.render(req, res, data, item.tpl, cursorNew, function(tpl) {
						result += tpl;
						callback();
					});
				} else if (item.type == 'include') {
					var cursorNew = (cursor == "") ? item.name : cursor+"."+item.name;
					req.impress.path = req.impress.url;
					impress.template(req, res, data, item.name, cursorNew, function(tpl) {
						if (tpl == impress.fileIsEmpty) callback();
						else {
							result += tpl || impress.templateNotFound+item.name;
							callback();
						}
					});
				}
			}, function(err) {
				callback(result);
			});
		} else callback(impress.fileIsEmpty);
	}

	// Substitute variables with values
	//   tpl  - template body
	//   data - global data structure to visualize
	//   cur  - current position in data structure
	//   returns result body
	//
	impress.subst = function(tpl, data, cur) {
		tpl = tpl.replace(/@([\.0-9a-zA-Z]+)@/g, function(s, key) {
			var name, pos = key.indexOf(".");
			if (pos == 0) name = cur+key; else name = key;
			var value = impress.value(data, name);
			if (typeof(value) == 'object') value = '[not found: '+key+']';
			return value;
		});
		return tpl;
	}

	// Return value from data structure
	//
	impress.value = function(data, name) {
		var name = name.split("."), obj = data;
		for (var i = 0; i < name.length; ++i) obj = obj[name[i]] || obj;
		return obj;
	}

	// Send static file
	//
	function static(req, res) {
		var application = req.impress.application,
			filePath = req.impress.hostDir+req.impress.path,
			httpCode = impress.customHttpCodes[req.impress.ext] || 200,
			buffer = application.cache.static[filePath];
		if (buffer) {
			if (buffer != impress.fileNotFound) {
				var sinceTime = req.headers['if-modified-since'];
				if (sinceTime && isTimeEqual(sinceTime, buffer.stats.mtime)) impress.error(req, res, 304);
				else {
					res.writeHead(httpCode, baseHeader(req.impress.ext, buffer.stats, buffer.compressed));
					res.end(buffer.data);
				}
				impress.stat.responseCount++;
			} else impress.error(req, res, 404);
		} else impress.fs.stat(filePath, function(err, stats) {
			if (err) {
				impress.error(req, res, 404);
				application.cache.static[filePath] = impress.fileNotFound;
				watchCache(application, filePath);
			} else {
				var sinceTime = req.headers['if-modified-since'];
				if (sinceTime && isTimeEqual(sinceTime, stats.mtime)) impress.error(req, res, 304);
				else compress(filePath, stats, httpCode, req, res);
			}
		});
	}

	// Refresh static in memory cache with compression and minification
	//    required parameters: filePath, stats
	//    optional parameters: httpCode, req, res
	//
	function compress(filePath, stats, httpCode, req, res) {
		var application = req.impress.application;
		impress.fs.readFile(filePath, function(error, data) {
			if (error) {
				if (res) {
					res.end();
					impress.stat.responseCount++;
				}
			} else {
				var ext = req ? req.impress.ext : fileExt(filePath);
				if (ext == 'js' && req.impress.application.config.files.minify) {
					data = impress.minify(data);
					stats.size = data.length;
				}
				if (!inArray(impress.compressedExt, ext) && stats.size>impress.compressAbove) {
					impress.zlib.gzip(data, function(err, data) {
						stats.size = data.length;
						if (res) {
							res.writeHead(httpCode, baseHeader(ext, stats, true));
							res.end(data);
							impress.stat.responseCount++;
						}
						application.cache.static[filePath] = { data:data, stats:stats, compressed: true };
					});
				} else {
					if (res) {
						res.writeHead(httpCode, baseHeader(ext, stats));
						res.end(data);
						impress.stat.responseCount++;
					}
					application.cache.static[filePath] = { data:data, stats:stats, compressed: false };
				}
				watchCache(application, filePath);
			}
		});
	}

	function isTimeEqual(since, mtime) {
		return (new Date(mtime)).getTime() == (new Date(since)).getTime();
	}

	// Send HTTP headers
	//
	function baseHeader(ext, stats, compressed) {
		var compressed = typeof(compressed) !== 'undefined' ? compressed : false;
		var header = {
			'Transfer-Encoding': 'chunked',
			'Content-Type': impress.mimeTypes[ext],
			'Cache-Control': 'public',
		};
		if (!inArray(impress.compressedExt, ext) && compressed) header['Content-encoding'] = 'gzip';
		if (stats) {
			//var start = 0, end = stats.size-1;
			//header['Accept-Ranges' ] = 'bytes';
			//header['Content-Range' ] = 'bytes '+start+'-'+end+'/'+stats.size;
			header['Content-Length'] = stats.size;
			header['Last-Modified' ] = stats.mtime.toGMTString();
		}
		return header;
	}

	function fileExt(fileName) {
		return impress.path.extname(fileName).replace('.','');
	}

	// Redirect to specified location
	//
	impress.redirect = function(res, location) {
		res.setHeader("Location", location);
		res.statusCode = 302;
	}

	// Clear cache hash starts with given substring
	//
	function clearCacheStartsWith(cache, startsWith, callback) {
		for (var key in cache) {
			if (key.startsWith(startsWith)) {
				delete cache[key];
				if (callback) callback(key);
			}
		}
	}

	// Cache watchers
	//
	function watchCache(application, filePath) {
		// TODO: test "in" operator against hash[key]
		var path = filePath;
		if (!filePath.endsWith("/")) path = impress.path.dirname(path)+"/";
		var watcher = application.cache.watchers[path];
		if (typeof(watcher) == 'undefined') {
			impress.fs.exists(path, function(exists) {
				if (exists) {
					watcher = impress.fs.watch(path, function(event, fileName) {
						var filePath = (fileName) ? path+fileName : path,
							ext = fileExt(fileName),
							watcher = application.cache.watchers[path];
						if (watcher.timers[filePath]) clearTimeout(watcher.timers[filePath]);
						watcher.timers[filePath] = setTimeout(function() {
							watcher.timer = null;
							impress.fs.stat(filePath, function(err, stats) {
								if (err) return;
								if (stats.isFile()) {
									var cache = application.cache[require.resolve(filePath)];
									if (application.cache.static[filePath]) {
										// Replace static files memory cache
										impress.fs.exists(filePath, function(exists) {
											if (exists) compress(filePath, stats);
										});
									} else if (ext == 'js' && cache) {
										// TODO: chack is config file changed and call soft restart
										// Replace changed js file in cache
										delete application.cache.scripts[filePath];
										impress.fs.exists(filePath, function(exists) {
											if (exists) application.createScript('', filePath, function(err, key, exports) {
												application.cache.scripts[filePath] = exports;
											});
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
													clearCacheStartsWith(application.cache.pages, path);
												}
											});
										});
									}
								} else {
									// Clear cache for all changed folders (created or deleted files)
									clearCacheStartsWith(application.cache.static, filePath);
									clearCacheStartsWith(application.cache.files, filePath, function(used) {
										var ext = fileExt(used);
										if (ext == 'js' && used in application.cache.scripts) {
											delete application.cache.scripts[used];
										} else if (ext == 'template' && used in application.cache.templates) {
											delete application.cache.templates[used];
										}
									});
									clearCacheStartsWith(application.cache.pages, filePath);
								}
							});
						}, 2000);
					});
					// TODO: close timers and watchers in application.clearCache
					watcher.timers = [];
					application.cache.watchers[path] = watcher;
				}
			});
		}
	}

} (global.impress = global.impress || {}));