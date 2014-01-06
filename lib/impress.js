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
		application.runScript = function(fileName, client, callback) {
			this.createScript(null, fileName, function(err, key, fn) {
				if (typeof(fn) == 'function') {
					var executionDomain = impress.domain.create();
					executionDomain.on('error', function(err) {
						client.error(500);
						logException(err);
						callback();
					});
					executionDomain.run(function() {
						fn(client, callback);
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
		application.createSandbox();

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
			watchCache(application, applicaion.configDir+'/');
		}

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
		}

		// Create or clear application cache
		//
		application.clearCache = function() {
			if (this.cache) {
				delete application.config;

				// Unwatch folders and clear cache
				for (var watcherPath in impress.cache.watchers) {
					var watcher = impress.cache.watchers[watcherPath];
					for (var key in watcher.timers) clearTimeout(watcher.timers[key]);
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
			}
		}
		application.clearCache();
	}

	mixinApplication(impress);

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
					extend(application, { name:appName, dir:appDir, configDir:appDir+'/config' });
					mixinApplication(application);
					application.loadConfig(function() {
						application.preprocessConfig();
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
			//TODO: application.preprocessConfig();

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
			if (global.cms) cms.init();

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
					impress.clearCache();
					for (var appName in impress.applications) impress.applications[appName].clearCache();
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
				console.log('  listen on '+server.address+':'+server.port);
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
		var client = new impress.Client(req, res);
		impress.stat.requestCount++;
		// Prepare impress structures
		req.client = client;
		res.client = client;
		client.startTime = new Date().getTime();
		client.access = clone(impress.defaultAccess);

		var server = (req.connection.server)
				? impress.config.servers[req.connection.server.serverName]
				: impress.config.servers[req.connection.pair.server.serverName],
			url = impress.url.parse(req.url);
		req.query = impress.querystring.parse(url.query);
		client.schema = (!req.connection.server) ? "https" : "http";
		client.url = url.pathname,
		client.path = client.url,
		client.ext = fileExt(client.url) || 'html';
		if (!req.headers.host) req.headers.host = 'no-host-name-in-http-headers';

		client.slowTime = server.slowTime;
		if (impress.log) impress.log.access(
			req.connection.remoteAddress+'\t'+
			req.method+'\t'+
			client.schema+'://'+req.headers.host+client.url+'\t'+
			req.headers['user-agent']
		);
		
		var isDispatched = false,
			isRouted = false,
			portOffset = req.headers.host.indexOf(':'),
			staticRx = null;
		client.host = (portOffset >= 0) ? req.headers.host.substr(0, portOffset) : req.headers.host;

		for (var appName in impress.applications) {
			var application = impress.applications[appName];
			if (application.hostsRx.test(client.host)) {
				//console.log('---APP:'+appName);
				client.application = application;
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
								//console.log('---ROUTE:');
								if (route.slowTime) client.slowTime = route.slowTime;
								var urlRoute = req.url;
								if (route.rewrite && match.length > 1) {
									urlRoute = route.rewrite.replace(/\[([0-9]+)\]/g, function(s, key) {
										return match[key] || s;
									});
								} else urlRoute = route.rewrite;
								if (route.host) {
									client.proxy(route.host, route.port || 80, urlRoute);
								} else {
									// TODO: here we should handle internal redirect
								}
								return;
							}
						}
						//if (!isRouted) client.error(404);
					}
					// Read POST parameters
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

	// Client class
	//
	var Сlient = function(req, res) {
		this.req = req;
		this.res = res;
	}
	impress.Client = Сlient;
	
	// Start session
	//
	Сlient.prototype.startSession = function() {
		if (!this.session) {
			var sid = impress.generateSID(this.application.config);
			this.session = sid;
			this.user = {};
			this.setCookie(this.application.config.sessions.cookie, sid);
			if (impress.config.cluster.cookie) client.setCookie(impress.config.cluster.cookie, impress.nodeId);
			impress.sessions[sid] = {
				sessionModified: true,
				sessionCreated: true
			};
		}
	}

	// Destroy session
	//
	Сlient.prototype.destroySession = function() {
		if (this.session) {
			this.deleteCookie(this.application.config.sessions.cookie);
			this.deleteCookie(impress.config.cluster.cookie);
			// clear other structures
			var userId = impress.sessions[this.session].userId;
			if (userId && impress.users[userId]) delete impress.users[userId].sessions[this.session];
			delete impress.sessions[this.session];
			// TODO: delete session from MongoDB persistent session storage
			if (impress.security) impress.security.deletePersistentSession(this.session);
			this.session = null;
			this.user = null;
		};
	}

	// Set cookie name=value, host is optional
	//
	Сlient.prototype.setCookie = function(name, value, host) {
		var expires = new Date(2100,01,01).toUTCString(),
			host = host || this.req.headers.host;
		this.cookies.push(name+"="+value+"; expires="+expires+"; Path=/; Domain="+host+"; HttpOnly");
	}

	// Delete cookie by name
	//
	Сlient.prototype.deleteCookie = function(name) {
		this.cookies.push(name+"=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain=."+this.req.headers.host);
	}

	// Send cookies prepared in client.cookies
	//
	Сlient.prototype.sendCookie = function() {
		if (this.cookies && this.cookies.length && !this.res.headersSent) {
			this.res.setHeader("Set-Cookie", this.cookies);
		}
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
	Сlient.prototype.proxy = function(host, port, url) {
		impress.http.request(
			{
				host: host,
				port: port,
				path: url,
				method: this.req.method
			},
			function(response) {
				this.res.writeHead(response.statusCode, response.headers);
				response.on('data', function(chunk) { this.res.write(chunk); });
				response.on('end', function() { this.end(); });
			}).on("error", function(err) {
				this.error(502);
			}
		).end();
		impress.stat.responseCount++;
	}

	// Restore session if available
	//
	Сlient.prototype.restoreSession = function() {
		// Parse cookies
		this.cookies = [];
		var client = this;
		if (this.req.headers.cookie) this.req.headers.cookie.split(';').forEach(function(cookie) {
			var parts = cookie.split('=');
			client.cookies[parts[0].trim()] = (parts[1] || '').trim();
		});
		// Detect session, restore session or delete cookie
		var sid = this.cookies[this.application.config.sessions.cookie];
		if (sid) {
			if (impress.validateSID(this.application.config, sid)) {
				if (impress.security && impress.sessions[sid]) {
					this.session = sid;
					this.logged = !!impress.sessions[sid].userId;
					if (impress.security) this.user = impress.security.getSessionUser(sid);
					this.processing();
				} else {
					if (this.application.config.sessions.persist && impress.security) {
						impress.security.restorePersistentSession(sid, function(err, session) {
							if (session) {
								var userId = session.userId;
								client.session = sid;
								client.user = impress.security.getSessionUser(sid);
								client.logged = !!userId;
							} else client.deleteCookie(client.application.config.sessions.cookie);
							client.processing();
						});
					} else this.processing();
				}
			} else {
				this.deleteCookie(client.application.config.sessions.cookie);
				this.processing();
			}
		} else this.processing();
	}

	// Save session
	//
	Сlient.prototype.saveSession = function(callback) {
		if (this.session && this.application.config.sessions.persist && impress.security) {
			var session = impress.sessions[this.session];
			if (session && (session.sessionCreated || session.sessionModified))
				impress.security.savePersistentSession(this.session, callback);
			else callback();
		} else callback();
	}

	// Process request by impress.js
	//
	Сlient.prototype.processing = function() {
		var application = this.application,
			client = this;
		this.handlers = ['access', 'request', this.req.method.toLowerCase()];
		this.context = {};

		// Set Content-Type if detected and not SSE
		if (this.ext == 'sse') this.sse = { channel: null };
		else if (this.ext != 'ws') {
			var contentType = impress.mimeTypes[this.ext];
			if (contentType && this.res.setHeader) this.res.setHeader('Content-Type', contentType);
		}

		// Execute handlers
		impress.async.eachSeries(this.handlers, function(handler, callback) {
			client.path = client.url;
			client.filehandler(handler, callback);
		}, function(err) {
			client.path = client.url;
			if (client.access.allowed) {
				if (client.ext == 'html' || client.ext == 'ajax') {
					var filePath = client.hostDir+client.path,
						buffer = application.cache.pages[filePath];
					if (buffer) { client.end(buffer); impress.stat.responseCount++; }
					else if (global.cms) cms.processing(client, processingPage);
					else client.processingPage();
				} else if (client.ext == 'sse') {
					if (impress.sse) impress.sse.connect(client);
					else client.error(510);
				} else if (client.ext == 'ws') {
					if (impress.websocket) impress.websocket.finalize(client);
					else client.error(510);
				} else if (client.ext == 'json') {
					var output = JSON.stringify(client.context.data);
					if (!output) client.error(404);
					else { client.end(output); impress.stat.responseCount++; }
				} else client.error(404);
			} else client.error(403);
		});
	}

	// Process dynamic and static pages, cms pages
	// TODO: implement CMS here
	// 
	Сlient.prototype.processingPage = function() {
		var application = this.application,
			client = this,
			data = this.context.data || {};
		this.template(data, 'html', '', function(tpl) {
			if (client.cachable) {
				var filePath = client.hostDir+client.path;
				application.cache.pages[filePath] = tpl;
			}
			client.end(tpl);
		});
	}
	
	// End request
	//
	Сlient.prototype.end = function(output) {
		var client = this;
		this.saveSession(function() {
			client.sendCookie();
			client.endTime = new Date().getTime();
			client.res.end(output);
			if (impress.log && client.endTime-client.startTime >= client.slowTime) impress.log.slow(
				(client.endTime-client.startTime)+'ms\t'+
				client.req.connection.remoteAddress+'\t'+
				client.req.method+'\t'+
				client.schema+'://'+client.req.headers.host+client.url+'\t'+
				client.req.headers['user-agent']
			);
			impress.stat.responseCount++;
		});
	}

	// End request with HTTP error code
	//
	Сlient.prototype.error = function(code) {
		if (code == 304) {
			this.res.statusCode = code;
			this.end();
		} else {
			if (this.res.setHeader) this.res.setHeader('Content-Type', impress.mimeTypes['html']);
			this.res.statusCode = code;
			var client = this,
				message = impress.httpErrorCodes[code] || 'Unknown error';
			this.include({title: "Error "+code, message: message}, __dirname+'/error.template', '', function(tpl) {
				client.end(tpl);
			});
		}
		impress.stat.responseCount++;
	}

	// Redirect to specified location
	//
	Сlient.prototype.redirect = function(location) {
		this.res.setHeader("Location", location);
		this.res.statusCode = 302;
	}

	// Find existent file to execute
	//
	Сlient.prototype.filehandler = function(file, callback) {
		var application = this.application,
			client = this,
			fileName = file+'.js',
			filePath = this.hostDir+lastSlash(this.path)+fileName,
			fileExecute = application.cache.files[filePath];
		if (fileExecute) {
			if (fileExecute != impress.fileNotFound) this.execute(fileExecute, callback);
			else this.error(404);
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				client.execute(filePath, callback);
				var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
				application.cache.files[fileOriginal] = filePath;
				watchCache(application, fileOriginal);
			} else {
				// Try to process request on parent directory
				if ((client.path != '/') && (client.path != '.')) {
					client.path = impress.path.dirname(client.path);
					client.filehandler(file, callback);
					var path = client.path,
						path = client.hostDir+path+(path.endsWith("/") ? "" : "/");
					watchCache(application, path);
				} else {
					// If last file in array
					// if (file == client.req.method.toLowerCase()) client.res.write('No handler found');
					// Lose hope to execute request and drop connection
					client.error(404);
					//callback();
					var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
					application.cache.files[fileOriginal] = impress.fileNotFound;
					watchCache(application, fileOriginal);
				}
			}
		});
	}

	// Execute existent file from cache or disk
	//
	Сlient.prototype.execute = function(filePath, callback) {
		this.access.allowed = (
			(
				(!this.logged && this.access.guests) ||
				(!!this.logged && this.access.logged)
			) && (
				(!!this.req.connection.server && this.access.http) ||
				(!this.req.connection.server && this.access.https)
			)
		);
		if (this.logged) {
			this.access.allowed = this.access.allowed && (
				(!this.access.groups) ||
				(this.access.groups &&
					(
						this.access.groups.length==0 ||
						inArray(this.access.groups, this.user.group)
					)
				)
			);
		}
		if (this.access.allowed) this.application.runScript(filePath, this, callback);
		else callback();
	}

	// Render template from file or cache
	//
	Сlient.prototype.template = function(data, file, cursor, callback) { // callback(tpl)
		var application = this.application,
			client = this,
			userGroup = '';
		if (this.logged) userGroup = '.'+(this.user.group || 'everyone');
		var fileName = file+userGroup+'.template',
			filePath = this.hostDir+lastSlash(this.path)+fileName,
			fileInclude = application.cache.files[filePath];
		if (fileInclude) {
			if (fileInclude != impress.fileNotFound) this.include(data, fileInclude, cursor, callback);
			else callback(impress.templateNotFound+file);
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				client.include(data, filePath, cursor, callback);
				var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
				application.cache.files[fileOriginal] = filePath;
				watchCache(application, fileOriginal);
			} else {
				// Try to find template without group name
				fileName = file+'.template';
				filePath = client.hostDir+lastSlash(client.path)+fileName;
				fileInclude = application.cache.files[filePath];
				if (fileInclude) {
					if (fileInclude != impress.fileNotFound) client.include(data, fileInclude, cursor, callback);
					else callback(impress.templateNotFound+file);
				} else impress.fs.exists(filePath, function(exists) {
					if (exists) {
						client.include(data, filePath, cursor, callback);
						var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
						application.cache.files[fileOriginal] = filePath;
						watchCache(application, fileOriginal);
					} else {
						// Try to find template in parent directory
						if ((client.path != '/') && (client.path != '.')) {
							client.path = impress.path.dirname(client.path);
							client.template(data, file, cursor, callback);
							var path = client.path,
								path = client.hostDir+path+(path.endsWith("/") ? "" : "/");
							watchCache(application, path);
						} else {
							// Lose hope to fine template and save cache
							var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
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
	Сlient.prototype.include = function(data, filePath, cursor, callback) { // callback(tpl)
		var application = this.application,
			client = this,
			cache = application.cache.templates[filePath];
		if (cache) {
			if (cache != impress.fileIsEmpty) this.render(data, cache, cursor, callback);
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
					client.render(data, tpl, cursor, callback);
				}
			});
			watchCache(application, filePath);
		}
	}

	// Render template from variable
	//
	Сlient.prototype.render = function(data, tpl, cursor, callback) { // callback(tpl)
		// parse template into structure
		if (tpl != impress.fileIsEmpty) {
			var structure = [],
				pos, tplBefore, tplInclude, dataInclude, dataItem, tplBody, arrayIndex;
			while (tpl.length>0) {
				// get tpl before includes
				pos = tpl.indexOf("@[");
				if (pos >= 0) {
					structure.push({type:'plain', tpl:tpl.substr(0, pos)});
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
						if (Array.isArray(dataInclude)) for (var dataItem in dataInclude) structure.push({type:'inline', name:tplInclude+'.'+arrayIndex++, tpl:tplBody});
						else structure.push({type:'inline', name:tplInclude, tpl:tplBody});
						tpl = tpl.substring(pos+5+tplInclude.length);
					} else {
						// handle included templates
						if (Array.isArray(dataInclude)) for (var dataItem in dataInclude) structure.push({type:'include', name:tplInclude+'.'+arrayIndex++});
						else structure.push({ type:'include', name:tplInclude });
					}
				} else {
					structure.push({type:'plain', tpl:tpl});
					tpl = '';
				}
			}
			// generate result from structure
			var result = '',
				client = this;
			impress.async.eachSeries(structure, function(item, callback) {
				if (item.type == 'plain') {
					result += impress.subst(item.tpl, data, cursor);
					callback();
				} else if (item.type == 'inline') {
					var cursorNew = (cursor == "") ? item.name : cursor+"."+item.name;
					client.render(data, item.tpl, cursorNew, function(tpl) {
						result += tpl;
						callback();
					});
				} else if (item.type == 'include') {
					var cursorNew = (cursor == "") ? item.name : cursor+"."+item.name;
					client.path = client.url;
					client.template(data, item.name, cursorNew, function(tpl) {
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
	Сlient.prototype.static = function() {
		var application = this.application,
			client = this,
			filePath = this.hostDir+this.path,
			httpCode = impress.customHttpCodes[this.ext] || 200,
			buffer = application.cache.static[filePath];
		if (buffer) {
			if (buffer != impress.fileNotFound) {
				var sinceTime = this.req.headers['if-modified-since'];
				if (sinceTime && isTimeEqual(sinceTime, buffer.stats.mtime)) this.error(304);
				else {
					this.res.writeHead(httpCode, baseHeader(this.ext, buffer.stats, buffer.compressed));
					this.end(buffer.data);
				}
				impress.stat.responseCount++;
			} else this.error(404);
		} else impress.fs.stat(filePath, function(err, stats) {
			if (err) {
				client.error(404);
				application.cache.static[filePath] = impress.fileNotFound;
				watchCache(application, filePath);
			} else {
				var sinceTime = client.req.headers['if-modified-since'];
				if (sinceTime && isTimeEqual(sinceTime, stats.mtime)) client.error(304);
				else compress(filePath, stats, application, client, httpCode);
			}
		});
	}

	// Refresh static in memory cache with compression and minification
	//    required parameters: filePath, stats
	//    optional parameters: client, httpCode
	//
	function compress(filePath, stats, application, client, httpCode) {
		impress.fs.readFile(filePath, function(error, data) {
			if (error) {
				if (client) {
					client.end();
					impress.stat.responseCount++;
				}
			} else {
				var ext = client ? client.ext : fileExt(filePath);
				if (ext == 'js' && client.application.config.files.minify) {
					data = impress.minify(data);
					stats.size = data.length;
				}
				if (!inArray(impress.compressedExt, ext) && stats.size>impress.compressAbove) {
					impress.zlib.gzip(data, function(err, data) {
						stats.size = data.length;
						if (client) {
							client.res.writeHead(httpCode, baseHeader(ext, stats, true));
							client.end(data);
							impress.stat.responseCount++;
						}
						application.cache.static[filePath] = {data:data, stats:stats, compressed: true};
					});
				} else {
					if (client) {
						client.res.writeHead(httpCode, baseHeader(ext, stats));
						client.end(data);
						impress.stat.responseCount++;
					}
					application.cache.static[filePath] = {data:data, stats:stats, compressed: false};
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
	function watchCache(application, filePath) {
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
									if (application.cache.static[filePath]) {
										// Replace static files memory cache
										impress.fs.exists(filePath, function(exists) {
											if (exists) compress(filePath, stats, application);
										});
									} else if (ext == 'js' && (filePath in application.cache.scripts)) {
										// Replace changed js file in cache
										impress.fs.exists(filePath, function(exists) {
											if (exists) {
												application.cache.scripts[filePath] = null;
												application.createScript('', filePath, function(err, key, exports) {
													application.cache.scripts[filePath] = exports;
													if (filePath.startsWith(application.configDir)) {
														var sectionName = filePath.replace(application.configDir+'/','').replace('.js', '');
														application.config[sectionName] = exports;
														application.preprocessConfig();
													}
												});
											} else {
												delete application.cache.scripts[filePath];
												if (filePath.startsWith(application.configDir)) {
													var sectionName = filePath.replace(application.configDir+'/','').replace('.js', '');
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
										var ext = fileExt(used);
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
					// TODO: close timers and watchers in application.clearCache
					watcher.timers = [];
					application.cache.watchers[path] = watcher;
				}
			});
		}
	}

} (global.impress = global.impress || {}));