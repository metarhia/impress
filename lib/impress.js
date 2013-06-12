(function(impress) {
	
	require('./global');
	require('./impress.constants');
	global.async = global.async || require('async');

	impress.dir = process.cwd().replace(/\\/g, '/');

	impress.os = require('os');
	impress.http = require('http');
	impress.https = require('https');
	impress.url = require('url');
	impress.path = require('path');
	impress.fs = require('fs');
	impress.net = require('net'),
	impress.cluster = require('cluster');
	impress.qs = require('querystring');
	impress.colors = require('colors');
	impress.readline = require('readline');
	impress.mkdirp = require('mkdirp');

	var configFile = impress.dir+'/config.js';
	impress.config = require(configFile);

	require('./db');
	require('./db.mongodb');

	impress.cache = {
		templates: [], // template body cache indexed by file name
		files:     [], // file override/inherited cache indexed by file name
		watchers:  []  // directory watchers indexed by directory name
	};

	impress.users = []; // authenticated users indexed by userId
	// to be implemented following structure: {
	//   sessions: [sid,...],      // one user can have many sessions
	//   state:    {...},          // user state data
	//   data:     {...},          // user accessed data cache
	//   access:   lastAccessTime  // last access time
	//   sse:      [],             // SSE/EventStream sockets to send events
	// }

	impress.sessions = []; // sessions indexed by SID
	// to be implemented following structure: {
	//   userId: int,   // optional: null of userId, if session assigned to user
	//   login: string,
	//   group: string,
	//   sse:  [],      // active SSE connections
	// }

	impress.log = {
		fdAccess: null,
		fdError:  null
	};

	// Write message to log
	//
	impress.log.write = function(fd, message) {
		if (fd) {
			var date = new Date();
			fd.write(date.toISOString()+'	'+message+'\n');
		}
	}

	// Write access to log
	//
	impress.log.access = function(message) {
		impress.log.write(impress.log.fdAccess, message);
	}

	// Write error to log
	//
	impress.log.error = function(message) {
		impress.log.write(impress.log.fdError, message);
	}

	// Open databases
	//
	impress.openDatabases = function(callback) {
		var databases = impress.config.databases;
		for (var databaseName in databases) {
			var database = databases[databaseName];
			db.mongoDB.open([{
				name: databaseName,
				url: database.url,
				collections: database.collections
			}], function() {
				if (callback) callback();
			});
		}
	}

	// Wipe and recreate data structures in MongoDB
	//
	impress.prepareDataStructures = function() {
		console.log('Impress'.bold.green+' installing initial data structures to MongoDB...'.green);
		var rl = impress.readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.question("Delete stored sessions and users if any? [y/n]: ", function(answer) {
			rl.close();
			if (answer == 'y') {
				db.impress.sessions.remove({}, function(err, collection) {
					console.log('  impress.'.green+'sessions'.bold.green+' ... deleted'.green);
					db.impress.users.remove({}, function(err, collection) {
						console.log('  impress.'.green+'users'.bold.green+' ... deleted'.green);
						console.log('Creating indexes: '.green)
						db.impress.users.createIndex( { login: 1 }, { unique: true }, function() {
							db.impress.sessions.createIndex( { sid: 1 }, { unique: true }, function() {
								db.impress.indexInformation(function(err, indexes) {
									console.dir({indexes: indexes});
									console.log('Done!'.bold.green);
									process.exit(0);
								});
							});
						});
					});
				});
			} else {
				console.log('Bye!'.green);
				process.exit(0);
			}
		});
	}

	// Load configuration and start server
	//
	impress.start = function(callback) {
		// Open log files
		impress.mkdirp(impress.dir+'/log', function (err) {
			if (err) {
				console.error(err);
				if (callback) callback();
			} else {
				if (impress.config.log.access) impress.log.fdAccess = impress.fs.createWriteStream(
					impress.dir+'/log/'+impress.config.log.access, {flags: 'a'}
				);
				if (impress.config.log.error) impress.log.fdError  = impress.fs.createWriteStream(
					impress.dir+'/log/'+impress.config.log.error, {flags: 'a'}
				);
			}
		});

		impress.openDatabases(callback);

		// Start workers
		if (impress.cluster.isMaster) {
			impress.workers = [];
			if (impress.config.cluster.strategy == "multiple" || impress.config.cluster.strategy == "sticky") {
				for (var workerId = 0; workerId < impress.config.cluster.workers; workerId++) impress.spawn(workerId);
			}
		} else {
			process.on('message', function(message, socket) {
				if (message.name !== 'impress:socket') return;
				var servers = impress.config.servers;
				for (var serverName in servers) {
					var server = servers[serverName];
					if (server.address == message.address && server.port == message.port) {
						socket.server = server.listener;
						server.listener.emit('connection', socket);
					}
				}
			});
		}

		// Prepare routes
		var routes = impress.config.routes;
		for (var routeName in routes) {
			var route = routes[routeName];
			route.urlRx = new RegExp('^'+route.url.replace(/\//g, "\\/")+'$');
		}

		// Prepare virtual hosts
		var hosts = impress.config.hosts;
		for (var hostName in hosts) {
			var host = hosts[hostName];
			host.nameRx = new RegExp('^('+host.name.replace(/\*/g, ".*")+')$');
			if (host.static) host.staticRx = staticRegExp(host.static);
		}

		// Start servers
		var servers = impress.config.servers,
			workerId = 0;
		for (var serverName in servers) {
			var server = servers[serverName],
				single = impress.config.cluster.strategy == "single",
				specialization = impress.config.cluster.strategy == "specialization",
				cloned = impress.config.cluster.strategy == "multiple" || impress.config.cluster.strategy == "sticky",
				master = impress.cluster.isMaster;
			if (server.static) server.staticRx = staticRegExp(server.static);
			if (master) {
				console.log('  listen on '+server.address+':'+server.port);
				if (single) {
					if (server.protocol == "https")
						server.listener = impress.https.createServer({
							key:  impress.fs.readFileSync(impress.dir+'/server.key'),
							cert: impress.fs.readFileSync(impress.dir+'/server.cer')
						}, impress.dispatcher);
					else server.listener = impress.http.createServer(impress.dispatcher);
				} else if (cloned) {
					if (impress.config.cluster.strategy == "sticky")
						server.listener = impress.net.createServer(impress.balancer);
				} else if (specialization) {
					impress.spawn(workerId, serverName);
					workerId++;
				}
			} else if (cloned || process.env['WORKER_SERVER_NAME'] == serverName) {
				if (server.protocol == "https")
					server.listener = impress.https.createServer({
						key:  impress.fs.readFileSync(impress.dir+'/server.key'),
						cert: impress.fs.readFileSync(impress.dir+'/server.cer')
					}, impress.dispatcher);
				else server.listener = impress.http.createServer(impress.dispatcher);
			}
			if (server.listener) {
				server.listener.on('error', function (e) {
					if (e.code == 'EADDRINUSE') {
						console.log('Can not bind to host/port');
						process.exit(1);
					}
				});
				server.listener.serverName = serverName;
				if ((master && !specialization) || (!master && !cloned)) {
					if (!impress.config.nagle) {
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

		// Convert static files mask e.g. ['/css/*', '/index.html'] into array of RegExps
		function staticRegExp(static) {
			if (static && static.length) {
				static = static.map(function(item) {
					item = escapeRegExp(item);
					return item.replace(/\\\*/g,".*");
				});
				return new RegExp('^('+static.join("|")+')$');
			} else return null;
		}
	}

	// Unload configuration and shutdown server
	//
	impress.stop = function() {
		var servers = impress.config.servers;
		for (var serverName in servers) {
			var server = servers[serverName];
			if (server.listener) server.listener.close();
		}
		delete require.cache[require.resolve(configFile)];
		delete impress.config;
		impress.cache.templates = [];
		impress.cache.files = [];
		// Unwatch all files
		for (var watcherPath in impress.cache.watchers) impress.cache.watchers[watcherPath].close();
		impress.cache.watchers = [];
		impress.sessions = [];

		if (impress.log.fdAccess) {
			impress.log.fdAccess.close();
			impress.log.fdAccess = null;
		}
		if (impress.log.fdError) {
			impress.log.fdError.close();
			impress.log.fdError = null;
		}
	}

	// Reload configuration and restart server
	//
	impress.restart = function() {
		if (impress.config) impress.stop();
		impress.start();
	}

	// Starting 
	//
	impress.init = function(callback) {
		if (impress.cluster.isMaster) console.log('Impress starting'.bold.green+', reading configuration'.green);
		impress.start(callback);
		impress.fs.watch(configFile, function() {
			if (impress.cluster.isMaster) console.log('Reloading server configuration'.green);
			impress.restart();
		});
		// Set garbage collection interval
		var gcInterval = duration(impress.config.cluster.gc);
		if (typeof(global.gc) === 'function' && gcInterval > 0) {
			setInterval(function () {
				global.gc();
			}, gcInterval*1000);
		}
	}

	// Spawn new worker
	// bind worker to serverName from config if serverName defined
	//
	impress.spawn = function (workerId, serverName) {
		var worker, env = {};
		env["WORKER_ID"] = workerId;
		if (typeof(serverName) !== "undefined") env["WORKER_SERVER_NAME"] = serverName;
		worker = impress.cluster.fork(env);
		impress.workers[workerId] = worker;
		worker.on('exit', function() {
			impress.spawn(workerId);
		});
	}

	// Dispatch requests
	//
	impress.dispatcher = function(req, res) {
		//req.pause();

		// Prepare impress structures
		req.impress = {};
		res.impress = {};
		req.impress.access = {
			guests: true,
			logged: true,
			http:   true,
			https:  true,
			groups: []
		};
		// !!! here we can check whether is it HTTP or HTTPS
		var server = (req.connection.server)
				? impress.config.servers[req.connection.server.serverName]
				: impress.config.servers[req.connection.pair.server.serverName],
			staticRx = server.staticRx,
			url = impress.url.parse(req.url);
		req.query = impress.qs.parse(url.query);
		req.impress.url = url.pathname,
		req.impress.path = req.impress.url,
		req.impress.hostDir = impress.dir+server.process.replace("[host]",req.headers.host);
		req.impress.ext = impress.path.extname(req.impress.url).replace('.','') || 'html';

		impress.log.access(
			req.connection.remoteAddress+'	'+
			req.method+'	'+
			'http://'+req.headers.host+req.impress.url+'	'+
			req.headers['user-agent']
		);

		for (var iHost = 0; iHost < server.hosts.length; ++iHost) { // --- FOREACH HOSTS ---
			var hostName = server.hosts[iHost],
				host = impress.config.hosts[hostName],
				portOffset = req.headers.host.indexOf(':');
			req.impress.host = (portOffset >= 0) ? req.headers.host.substr(0, portOffset) : req.headers.host;
			if (host.nameRx.test(req.impress.host)) {
				if (host.static) staticRx = host.staticRx;
				if (staticRx) {
					if (host.process) req.impress.hostDir = impress.dir+host.process;
					if (staticRx.test(req.impress.url)) {
						impress.static(req, res);
						return;
					} else {
						if (host.routes) {
							for (var iRoute = 0; iRoute < host.routes.length; ++iRoute) { // --- FOREACH ROUTE ---
								var routeName = host.routes[iRoute],
									route = impress.config.routes[routeName],
									match = req.impress.url.match(route.urlRx);
								if (match) {
									var urlRoute = req.impress.url;
									if (route.rewrite && match.length > 1) {
										urlRoute = route.rewrite.replace(/\[([0-9]+)\]/g, function(s, key) {
											return match[key] || s;
										});
									}
									impress.route(req, res, route.host, route.port, urlRoute);
									return;
								}
							} // --- END FOREACH ROUTE ---
						}
						if (host.process) {
							// Read POST parameters
							if (req.method === "POST") {
								req.impress.data = "";
								req.on("data", function(chunk) {
									req.impress.data += chunk;
								});
								req.on("end", function() {
									req.post = impress.qs.parse(req.impress.data);
									impress.restoreSession(req, res)
								});
							} else impress.restoreSession(req, res);
							return;
						}
					}
				}
			}
		} // --- END FOREACH HOSTS ---
	}

	// Start session
	//
	impress.startSession = function(req, res) {
		if (!req.impress.session) {
			var sid = impress.generateSID();
			req.impress.session = sid;
			impress.setCookie(req, res, impress.config.session.cookie, sid);
			if (impress.config.cluster.cookie) {
				var workerId = impress.cluster.isMaster ? 0 : process.env['WORKER_ID'],
					nodeId = impress.config.cluster.name+'N'+workerId;
				impress.setCookie(req, res, impress.config.cluster.cookie, nodeId);
			}
			impress.sessions[sid] = {};
			req.impress.sessionModified = true;
			req.impress.sessionCreated = true;
		}
	}

	// Destroy session
	//
	impress.destroySession = function(req, res) {
		if (req.impress.session) {
			impress.deleteCookie(req, res, impress.config.session.cookie);
			impress.deleteCookie(req, res, impress.config.cluster.cookie);
			// clear other structures
			delete impress.sessions[req.impress.session];
			req.impress.session = null;
			// !!! Delete from MongoDB
		};
	}

	// Set cookie name=value, host is optional
	//
	impress.setCookie = function(req, res, name, value, host) {
		var expires = new Date(2100,01,01).toUTCString(),
			host = host || "."+req.headers.host;
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
		if (res.impress.cookies && res.impress.cookies.length) res.setHeader("Set-Cookie", res.impress.cookies);
	}

	// Generate SID
	//
	impress.generateSID = function() {
		var key = generateKey(
				impress.config.session.length-2,
				impress.config.session.characters
			);
		return key+impress.crcSID(key);
	}

	impress.crcSID = function(key) {
		var c1 = key.indexOf(key.charAt(key.length-1)),
			c2 = key.indexOf(key.charAt(key.length-2)),
			s1 = impress.config.session.characters.charAt(c1),
			s2 = impress.config.session.characters.charAt(c2);
		return s1+s2;
	}

	impress.validateSID = function(sid) {
		if (!sid) return false;
		var crc = sid.substr(sid.length-2);
			key = sid.substr(0, sid.length-2);
		return impress.crcSID(key) == crc;
	}

	// Register user, return true/false
	//
	impress.register = function(login, pass, callback) {
		impress.getUser(login, function(err, node) {
			if (!node) {
				db.impress.users.insert({
					login: login,
					password: pass
				}, function(err, nodes) {
					if (callback) callback(null, nodes);
				});
			} else if (callback) callback("already registered", nodes);
		});
	}

	// Get user record from database
	// 
	impress.getUser = function(login, callback) {
		db.impress.users.findOne({ login: login }, function(err, node) {
			callback(err, node);
		});
	}

	// Balancer for sticky mode
	//
	impress.balancer = function(socket) {
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
		//socket = null;
	}

	// Route request to external HTTP server
	//
	impress.route = function(req, res, host, port, url) {
		impress.http.request({
			host: host,
			port: port,
			path: url,
			method: req.method
		},
		function(response) {
			res.writeHead(response.statusCode, response.headers);
			response.on('data', function (chunk) { res.write(chunk); });
			response.on('end', function () { res.end(); });
		}).on("error", function(err) {
			impress.error(req, res, 502); // err.message
		})
		.end();
	}

	// Restore session if available
	//
	impress.restoreSession = function(req, res) {
		// Parse cookies
		req.impress.cookies = [];
		res.impress.cookies = [];
		req.impress.sessionModified = false;
		req.impress.sessionCreated = false;
		if (req.headers.cookie) req.headers.cookie.split(';').forEach(function(cookie) {
			var parts = cookie.split('=');
			req.impress.cookies[parts[0].trim()] = (parts[1] || '').trim();
		});
		// Detect session, restore session or delete cookie
		var sid = req.impress.cookies[impress.config.session.cookie];
		if (impress.validateSID(sid)) {
			if (impress.sessions[sid]) {
				req.impress.session = sid;
				impress.process(req, res);
			} else {
				db.impress.sessions.findOne({ sid: sid }, function(err, session) {
					if (session) {
						req.impress.session = sid;
						impress.sessions[sid] = session.state;
					} else impress.deleteCookie(req, res, impress.config.session.cookie);
					impress.process(req, res);
				});
			}
		} else {
			impress.deleteCookie(req, res, impress.config.session.cookie);
			impress.process(req, res);
		}
	}

	// Save session
	//
	impress.saveSession = function(req, res, callback) {
		var session = { sid: req.impress.session, state: impress.sessions[req.impress.session] };
		if (req.impress.sessionCreated) db.impress.sessions.insert(session, callback);
		else if (req.impress.sessionModified) db.impress.sessions.update({ sid: req.impress.session }, session, callback);
		else callback();
	}

	// Process request by impress.js
	//
	impress.process = function(req, res) {	
		req.impress.handlers = ['access', 'request', req.method.toLowerCase()];
		res.context = {};

		// Set Content-Type if detected
		var contentType = impress.mimeTypes[req.impress.ext];
		if (contentType) res.setHeader('Content-Type', contentType);

		// Execute handlers
		async.eachSeries(req.impress.handlers, function(handler, callback) {
			req.impress.path = req.impress.url;
			impress.file(req, res, handler, function() {
				callback();
			});
		}, function(err) {
			req.impress.path = req.impress.url;
			if (req.impress.ext == 'html') {
				// Render html template
				var data = res.context.data || {};
				impress.template(req, res, data, 'html', '', function(tpl) {
					impress.end(req, res, tpl);
				});
			} else {
				var output = '';
				if (req.impress.ext == 'json') output = JSON.stringify(res.context.data);
				if (!output) impress.error(req, res, 404);
				else impress.end(req, res, output);
			}
		});
	}

	// End request
	//
	impress.end = function(req, res, output) {
		impress.saveSession(req, res, function() {
			impress.sendCookie(req, res);
			res.end(output);
		});
	}

	// End request with HTTP error code
	//
	impress.error = function(req, res, code) {
		if (code==304) {
			res.statusCode = code;
			impress.end(req, res);
		} else {
			res.setHeader('Content-Type', impress.mimeTypes['html']);
			res.statusCode = code;
			var message = impress.httpErrorCodes[code] || 'Unknown error';
			impress.include(req, res, {title: "Error "+code, message: message}, __dirname+'/error.template', '', function(tpl) {
				impress.end(req, res, tpl);
			});
		}
	}

	// Find existent file to execute
	//
	impress.file = function(req, res, file, callback) {
		var fileName = file+'.js',
			filePath = req.impress.hostDir+lastSlash(req.impress.path)+fileName,
			fileExecute = impress.cache.files[filePath];
		if (fileExecute) {
			if (fileExecute != "{{FILE_NOT_FOUND}}") impress.execute(req, res, fileExecute, callback);
			else {
				impress.error(req, res, 404); // 'No handler found'
			}
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				impress.execute(req, res, filePath, callback);
				var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
				impress.cache.files[fileOriginal] = filePath;
				impress.watchCache(fileOriginal);
			} else {
				// Try to process request on parent directory
				if ((req.impress.path != '/') && (req.impress.path != '.')) {
					req.impress.path = impress.path.dirname(req.impress.path);
					impress.file(req, res, file, callback);
					impress.watchCache(req.impress.hostDir+req.impress.path+(req.impress.path.endsWith("/") ? "" : "/"));
				} else {
					// If last file in array
					if (file == req.method.toLowerCase()) res.write('No handler found');
					// Lose hope to execute request and drop connection
					impress.error(req, res, 404); // !!!
					//callback();
					var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
					impress.cache.files[fileOriginal] = "{{FILE_NOT_FOUND}}";
					impress.watchCache(fileOriginal);
				}
			}
		});
	}

	// Execute existent file from cache or disk
	//
	impress.execute = function(req, res, filePath, callback) {
		var cache = require.cache[require.resolve(filePath)];
		if (cache) cache = cache.exports;
		else {
			cache = require(filePath);
			impress.watchCache(filePath);
		}
		// !!! check access here
		//if (
		//	(!req.impress.session && req.impress.access.guests) ||
		//	(req.impress.session && req.impress.access.guest)
		//) {
			if (typeof(cache) == "function") cache(req, res, callback);
			else callback();
		//} else callback();
	}

	// Render template from file or cache
	//
	impress.template = function(req, res, data, file, cursor, callback) { // callback(tpl)
		var userGroup = '';
		if (req.impress.session) userGroup = '.'+(impress.sessions[req.impress.session].group || 'everyone');
		var fileName = file+userGroup+'.template',
			filePath = req.impress.hostDir+lastSlash(req.impress.path)+fileName;
			fileInclude = impress.cache.files[filePath];
		if (fileInclude) {
			if (fileInclude != "{{FILE_NOT_FOUND}}") impress.include(req, res, data, fileInclude, cursor, callback);
			else callback('[ Error: template not found "'+file+'" ]');
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				impress.include(req, res, data, filePath, cursor, callback);
				var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
				impress.cache.files[fileOriginal] = filePath;
				impress.watchCache(fileOriginal);
			} else {
				// Try to find template without group name
				fileName = file+'.template',
				filePath = req.impress.hostDir+lastSlash(req.impress.path)+fileName;
				fileInclude = impress.cache.files[filePath];
				if (fileInclude) {
					if (fileInclude != "{{FILE_NOT_FOUND}}") impress.include(req, res, data, fileInclude, cursor, callback);
					else callback('[ Error: template not found "'+file+'" ]');
				} else impress.fs.exists(filePath, function(exists) {
					if (exists) {
						impress.include(req, res, data, filePath, cursor, callback);
						var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
						impress.cache.files[fileOriginal] = filePath;
						impress.watchCache(fileOriginal);
					} else {
						// Try to find template in parent directory
						if ((req.impress.path != '/') && (req.impress.path != '.')) {
							req.impress.path = impress.path.dirname(req.impress.path);
							impress.template(req, res, data, file, cursor, callback);
							impress.watchCache(req.impress.hostDir+req.impress.path+(req.impress.path.endsWith("/") ? "" : "/"));
						} else {
							// Lose hope to fine template and cave cache
							var fileOriginal = req.impress.hostDir+lastSlash(req.impress.url)+fileName;
							impress.cache.files[fileOriginal] = "{{FILE_NOT_FOUND}}";
							impress.watchCache(fileOriginal);
							callback('No handler found');
						}
					}
				});
			}
		});
	}

	// Include template
	//
	impress.include = function(req, res, data, filePath, cursor, callback) { // callback(tpl)
		var cache = impress.cache.templates[filePath];
		if (cache) impress.render(req, res, data, cache, cursor, callback);
		else {
			impress.fs.readFile(filePath, 'utf8', function(err, tpl) {
				impress.cache.templates[filePath] = tpl;
				if (err) callback('[ Error: template not found "'+filePath+'" ]');
				else impress.render(req, res, data, tpl, cursor, callback);
			});
			impress.watchCache(filePath);
		}
	}

	// Render template from variable
	//
	impress.render = function(req, res, data, tpl, cursor, callback) { // callback(tpl)
		// parse template into structure
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
					if (Array.isArray(dataInclude)) for (dataItem in dataInclude) structure.push({
						type:'inline', name:tplInclude+'.'+arrayIndex++, tpl:tplBody
					}); else structure.push({ type:'inline', name:tplInclude, tpl:tplBody });
					tpl = tpl.substring(pos+5+tplInclude.length);
				} else {
					// handle included templates
					if (Array.isArray(dataInclude)) for (dataItem in dataInclude) structure.push({
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
		async.eachSeries(structure, function(item, callback) {
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
					result += tpl || '[ Warning: template not found "'+item.name+'" ]';
					callback();
				});
			}
		}, function(err) {
			callback(result);
		});
	}

	// Substitute variables with values
	//   tpl  - template body
	//   data - global data structure to visualize
	//   cur  - current position in data structure
	//   returns result body
	//
	impress.subst = function(tpl, data, cursor) {
		tpl = tpl.replace(/@([\.0-9a-zA-Z]+)@/g, function(s, key) {
			var name, pos = key.indexOf(".");
			if (pos == 0) name = cursor+key; else name = key;
			return impress.value(data, name);
		});
		return tpl;
	}

	// Return value from data structure
	//
	impress.value = function(data, name) {
		var name = name.split("."),
			obj = data;
		for (var i = 0; i < name.length; ++i) obj = obj[name[i]] || obj;
		return obj;
	}

	// Send static file
	//
	impress.static = function(req, res) {
		var filePath = req.impress.hostDir+req.impress.path,
			setAcceptRanges = true, // whether we should send file size in headers
			httpCode = impress.customHttpCodes[req.impress.ext] || 200;
		impress.fs.stat(filePath, function(err, stats) {
			if (err) {
				impress.error(req, res, 404);
				return;
			}
			var ifSince = req.headers['if-modified-since'];
			if (ifSince && stats) {
				var now = (new Date(stats.mtime)).getTime();
				var since = (new Date(ifSince)).getTime();
				if (since === now) {
					impress.error(req, res, 304);
					return;
				}
			}
			res.writeHead(httpCode, impress.baseHeader(req.impress.ext, stats));
			var readStream = impress.fs.createReadStream(filePath);
			readStream.pipe(res);
			readStream.on('end', function() { res.end(); });
		});
	}

	// Send HTTP headers
	//
	impress.baseHeader = function(ext, stats) {
		var header = {
			'Transfer-Encoding': 'chunked',                                       // почему chunked для всех
			'Content-Type':      impress.mimeTypes[ext]
			//'Cache-Control':   'no-cache, no-store, max-age =0, must-revalidate',
			//'Pragma':          'no-cache'
		};
		if (stats) {
			var start = 0,
				end = stats.size-1;
			header['Accept-Ranges' ] = 'bytes';
			header['Content-Range' ] = 'bytes '+start+'-'+end+'/'+stats.size;
			header['Content-Length'] = stats.size;
			header['Last-Modified' ] = stats.mtime;
		}
		return header;
	}

	// Redirect to specified location
	//
	impress.redirect = function(res, location) {
		res.setHeader("Location", "/");
		res.statusCode = 302;
	}

	// Cache watchers
	//
	impress.watchCache = function(filePath) {
		var path = filePath;
		if (!filePath.endsWith("/")) path = impress.path.dirname(path)+"/";
		var watcher = impress.cache.watchers[path];
		if (typeof(watcher) == 'undefined') {
			impress.fs.exists(path, function(exists) {
			    if (exists) {
					watcher = impress.fs.watch(path, function (event, fileName) {
						var filePath = (fileName) ? path+fileName : path,
							ext = impress.path.extname(fileName).replace('.','');
						if (ext == 'js') {
							// Replace changed js file in cache
							delete require.cache[require.resolve(filePath)];
							impress.fs.exists(filePath, function(exists) {
								if (exists) require(filePath);
							});
						} else if (ext == 'template') {
							// Replace changed template file in cache
							delete impress.cache.templates[filePath];
							impress.fs.exists(filePath, function(exists) {
								if (exists) impress.fs.readFile(filePath, 'utf8', function(err, tpl) {
									impress.cache.templates[filePath] = tpl;
								});
							});
						} else {
							// Clear cache for all changed folders (created or deleted files)
							for (desired in impress.cache.files) {
								var used = impress.cache.files[desired];
								if (desired.startsWith(filePath)) delete impress.cache.files[desired];
								ext = impress.path.extname(used).replace('.','');
								if (used.startsWith(filePath)) {
									if (ext == 'js') delete require.cache[require.resolve(used)];
									else if (ext == 'template') delete impress.cache.templates[used];
									delete impress.cache.files[desired];
								}
							}
						}
					});
					impress.cache.watchers[path] = watcher;
				}
			});
		}
	}

} (global.impress = global.impress || {}));