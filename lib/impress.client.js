"use strict";

(function(impress) {

	// Client class
	//
	var Client = function(req, res, application) {
		var server = req.connection.server ? req.connection.server : req.connection.pair.server,
			url = impress.url.parse(req.url);

		req.client = this;
		res.client = this;

		this.req = req;
		this.res = res;
		this.application = application;
		this.startTime = new Date().getTime();
		this.access = clone(impress.defaultAccess);
		this.calculateAccess();
		this.query = impress.querystring.parse(url.query);
		this.schema = (!req.connection.server) ? "https" : "http";
		this.url = url.pathname;
		this.path = url.pathname;
		this.ext = impress.fileExt(url.pathname);
		this.typeExt = this.ext || 'html';
		this.slowTime = server.slowTime;

		if (!req.headers.host) req.headers.host = 'no-host-name-in-http-headers';

		if (this.application.log) this.application.log.access(
			req.connection.remoteAddress+'\t'+
			req.method+'\t'+
			this.schema+'://'+req.headers.host+this.url+'\t'+
			req.headers['user-agent']
		);
		var portOffset = req.headers.host.indexOf(':');
		this.host = (portOffset >= 0) ? req.headers.host.substr(0, portOffset) : req.headers.host;
	};
	impress.Client = Client;

	// Fork long worker
	//
	Client.prototype.fork = function(workerFile) {
		var clientData = JSON.stringify({
			url: this.url,
			query: this.query,
			session: this.session,
			user: this.user,
			context: this.context,
			fields: this.fields
		});
		var fileName = this.hostDir+lastSlash(this.path)+workerFile+'.js';
		if (impress.cluster.isMaster) impress.forkLongWorker(this.application.name, fileName, clientData);
		else process.send({
			name:       'impress:longworker',
			appName:    this.application.name,
			workerFile: fileName,
			clientData: clientData
		});
	};

	// Start session
	//
	Client.prototype.startSession = function() {
		if (!this.session) {
			var sid = impress.generateSID(this.application.config);
			this.session = sid;
			this.user = {};
			this.setCookie(this.application.config.sessions.cookie, sid);
			if (impress.config.cluster.cookie) this.setCookie(impress.config.cluster.cookie, impress.nodeId);
			this.application.sessions[sid] = {
				sessionModified: true,
				sessionCreated: true
			};
		}
	};

	// Destroy session
	//
	Client.prototype.destroySession = function() {
		if (this.session) {
			this.deleteCookie(this.application.config.sessions.cookie);
			this.deleteCookie(impress.config.cluster.cookie);
			// clear other structures
			var userId = this.application.sessions[this.session].userId;
			if (userId && this.application.users[userId]) delete this.application.users[userId].sessions[this.session];
			delete this.application.sessions[this.session];
			// TODO: delete session from MongoDB persistent session storage
			if (impress.security) impress.security.deletePersistentSession(this.session);
			this.session = null;
			this.user = null;
		}
	};

	// Set cookie name=value, host is optional
	//
	Client.prototype.setCookie = function(name, value, host, httpOnly) {
		var expires = new Date(2100,1,1).toUTCString();
		host = host || this.req.headers.host;
		if (typeof(httpOnly)=='undefined') httpOnly = true;
		this.cookies.push(name+"="+value+"; expires="+expires+"; Path=/; Domain="+host+ (httpOnly ? "; HttpOnly" : ""));
	};

	// Delete cookie by name
	//
	Client.prototype.deleteCookie = function(name) {
		this.cookies.push(name+"=deleted; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; Domain=."+this.req.headers.host);
	};

	// Send cookies prepared in client.cookies
	//
	Client.prototype.sendCookie = function() {
		if (this.cookies && this.cookies.length && !this.res.headersSent) {
			this.res.setHeader("Set-Cookie", this.cookies);
		}
	};

	// Route request to external HTTP server
	//
	Client.prototype.proxy = function(host, port, url) {
		var client = this;
		var req = impress.http.request(
			{
				hostname: host,
				port: port,
				path: url,
				method: client.req.method,
			},
			function(response) {
				client.res.writeHead(response.statusCode, response.headers);
				response.on('data', function(chunk) {
					client.res.write(chunk);
				});
				response.on('end', function() { client.end(); });
			}
		);
		req.on('error', function(e) {
			console.log('problem with request: ' + e.message);
		});
		req.end();
		impress.stat.responseCount++;
	};

	// Restore session if available
	//
	Client.prototype.restoreSession = function() {
		// Parse cookies
		var client = this;
		client.cookies = [];
		if (client.req.headers.cookie) client.req.headers.cookie.split(';').forEach(function(cookie) {
			var parts = cookie.split('=');
			client.cookies[parts[0].trim()] = (parts[1] || '').trim();
		});
		// Detect session, restore session or delete cookie
		var sid = client.cookies[client.application.config.sessions.cookie];
		if (sid) {
			if (impress.validateSID(client.application.config, sid)) {
				if (impress.security && client.application.sessions[sid]) {
					client.session = sid;
					client.logged = !!client.application.sessions[sid].userId;
					if (impress.security) client.user = impress.security.getSessionUser(client.application, sid);
                    if (client.passport) client.passport.init(client.processing); else client.processing();
				} else {
					if (client.application.config.sessions.persist && impress.security) {
						impress.security.restorePersistentSession(this, sid, function(err, session) {
							if (session) {
								var userId = session.userId;
								client.session = sid;
								client.user = impress.security.getSessionUser(client.application, sid);
								client.logged = !!userId;
							} else client.deleteCookie(client.application.config.sessions.cookie);
                            if (client.passport) client.passport.init(client.processing); else client.processing();
						});
					} else if (client.passport) client.passport.init(client.processing); else client.processing();
				}
			} else {
				client.deleteCookie(client.application.config.sessions.cookie);
                if (client.passport) client.passport.init(client.processing); else client.processing();
			}
		} else {
            client.startSession();
            if (client.passport) client.passport.init(client.processing); else client.processing();
        }
	};

	// Save session
	//
	Client.prototype.saveSession = function(callback) {
		if (this.session && this.application.config.sessions.persist && impress.security) {
			var session = this.application.sessions[this.session];
			if (session && (session.sessionCreated || session.sessionModified))
				impress.security.savePersistentSession(this, this.session, callback);
			else callback();
		} else callback();
	};

	// Process request by impress.js
	//
	Client.prototype.processing = function() {
		var client = this,
			application = client.application;
		client.handlers = ['access', 'request', client.req.method.toLowerCase()];
		client.context = {};

		// Set Content-Type if detected and not SSE
		if (client.typeExt == 'sse') client.sse = { channel: null };
		else if (client.typeExt != 'ws') {
			var contentType = impress.mimeTypes[client.typeExt];
			if (contentType && client.res.setHeader) client.res.setHeader('Content-Type', contentType);
		}

		// Execute handlers
		impress.async.eachSeries(client.handlers, function(handler, callback) {
			client.path = client.url;
			client.fileHandler(handler, callback);
		}, function(err) {
			client.path = client.url;
			if (client.access.allowed) {
				if (client.ext === '' && client.access.intro) {
					client.introspect();
				} else if (client.typeExt == 'html' || client.typeExt == 'ajax') {
					var filePath = client.hostDir+client.path,
						buffer = application.cache.pages[filePath];
					if (buffer) client.end(buffer);
					else if (global.cms) cms.processing(client, processingPage);
					else client.processingPage();
				} else if (client.typeExt == 'sse') {
					if (impress.sse) impress.sse.connect(client);
					else client.error(510);
				} else if (client.typeExt == 'ws') {
					if (impress.websocket) impress.websocket.finalize(client);
					else client.error(510);
				} else if (client.typeExt == 'json') {
					var output = JSON.stringify(client.context.data);
					if (!output) client.error(404);
					else client.end(output);
				} else client.error(404);
			} else client.error(403);
		});
	};

	// Process dynamic and static pages, cms pages
	// TODO: implement CMS here
	// 
	Client.prototype.processingPage = function() {
		var client = this,
			application = client.application,
			data = client.context.data || {};
		client.template(data, 'html', '', function(tpl) {
			if (client.cachable) {
				var filePath = client.hostDir+client.path;
				application.cache.pages[filePath] = tpl;
			}
			client.end(tpl);
		});
	};

	// End request
	//
	Client.prototype.end = function(output) {
		var client = this;
		client.saveSession(function() {
			client.sendCookie();
			client.endTime = new Date().getTime();
			client.res.end(output);
			if (client.application.log && client.endTime-client.startTime >= client.slowTime) client.application.log.slow(
				(client.endTime-client.startTime)+'ms\t'+
				client.req.connection.remoteAddress+'\t'+
				client.req.method+'\t'+
				client.schema+'://'+client.req.headers.host+client.url+'\t'+
				client.req.headers['user-agent']
			);
			impress.stat.responseCount++;
		});
	};

	// End request with HTTP error code
	//
	Client.prototype.error = function(code) {
		this.res.statusCode = code;
		if (code == 304) this.end();
		else {
			if (this.res.setHeader && !this.res.headersSent) this.res.setHeader('Content-Type', impress.mimeTypes['html']);
			var client = this,
				message = impress.httpErrorCodes[code] || 'Unknown error';
			this.include({ title:"Error "+code, message:message }, impress.templatesDir+'/error.template', '', function(tpl) {
				client.end(tpl);
			});
		}
	};

	// Directory index
	//
	Client.prototype.index = function(indexPath) {
		var client = this;
		client.fileHandler('access', function() {
			if (client.access.index) {
				client.path = client.url;
				if (client.res.setHeader) client.res.setHeader('Content-Type', impress.mimeTypes['html']);
				var files = [], dirs = [], dirPath = '';
				client.url.split('/').forEach(function(dir) {
					if (dir !== '') {
						dirPath = dirPath+'/'+dir;
						dirs.push({ name:dir, path:dirPath+'/' });
					}
				});
				impress.fs.readdir(indexPath, function(err, flist) {
					var cbCount = flist.length, cbIndex = 0;
					files.push({ name:'/..', path:'..', size:'up', mtime:' ' });
					for (var i in flist) {
						(function() {
							var fileName = flist[i],
								filePath = indexPath+'/'+fileName;
							impress.fs.stat(filePath, function(err, stats) {
								if (!err) {
									var mtime = stats.mtime.toSimpleString();
									if (stats.isDirectory()) files.push({ name:'/'+fileName, path:fileName+'/', size:'dir', mtime:mtime });
									else files.push({ name:fileName, path:fileName, size:bytesToSize(stats.size), mtime:mtime });
								}
								if (++cbIndex>=cbCount) {
									files.sort(function(a, b) {
										var s1 = a.name, s2 = b.name;
										if (s1.charAt(0) != '/') s1 = '0'+s1;
										if (s2.charAt(0) != '/') s2 = '0'+s2;
										if (s1 < s2) return -1;
										if (s1 > s2) return 1;
										return 0;
									});
									client.include(
										{ title:"Directory index", path:client.url, files:files, dirs:dirs },
										impress.templatesDir+'/index.template', '',
										function(tpl) { client.end(tpl); }
									);
								}
							});
						} ());
					}
				});
			} else client.error(403);
		});
	};

	// API Introspection
	//
	Client.prototype.introspect = function() {
		var client = this,
			introPath = client.hostDir+client.url;
		impress.fs.stat(introPath, function(err, stats) {
			if (err) client.error(404);
			else {
				if (stats.isDirectory()) {
					var files = [], dirs = [], dirPath = '';
					client.url.split('/').forEach(function(dir) {
						if (dir !== '') {
							dirPath = dirPath+'/'+dir;
							dirs.push({ name:dir, path:dirPath+'/' });
						}
					});
					impress.fs.readdir(introPath, function(err, flist) {
						var cbCount = flist.length, cbIndex = 0;
						files.push({ name:'/..', path:'..', method:'up', mtime:' ' });
						for (var i in flist) {
							(function() {
								var fileName = flist[i],
									filePath = introPath+'/'+fileName;
								impress.async.parallel({
									stats: function(callback) {
										impress.fs.stat(filePath, function(err, stats) { callback(null, stats); });
									},
									get: function(callback) {
										impress.fs.exists(filePath+'/get.js', function(exists) { callback(null, exists); });
									},
									post: function(callback) {
										impress.fs.exists(filePath+'/post.js', function(exists) { callback(null, exists); });
									},
									meta: function(callback) {
										client.fileHandler('meta', function() { callback(null, client.meta); });
									}
								}, function(err, results) {
									if (results.stats) {
										var mtime = results.stats.mtime.toSimpleString();
										if (results.stats.isDirectory()) {
											var ext = impress.fileExt(fileName),
												method = 'unknown';
											if (ext == 'json') method = 'JSON API Method';
											else if (ext == 'ajax') method = 'AJAX Handler';
											else if (ext == 'sse') method = 'Server-Sent Events';
											else if (ext == 'ws') method = 'WebSocket';
											else if (ext == '') method = 'dir';
											if (results.get) method += ' GET';
											if (results.post) method += ' POST';
											files.push({ name:'/'+fileName, path:fileName+'/', method:method, mtime:mtime });
										}
										if (++cbIndex>=cbCount) {
											files.sort(function(a, b) {
												var s1 = a.name, s2 = b.name;
												if (s1 < s2) return -1;
												if (s1 > s2) return 1;
												return 0;
											});
											client.include(
												{ title:"API Introspection index", path:client.url, files:files, dirs:dirs },
												impress.templatesDir+'/introspection.template', '',
												function(tpl) { client.end(tpl); }
											);
										}
									}
								});
							} ());
						}
					});
				} else client.error(403);
			}
		});
	};

	// Redirect to specified location
	//
	Client.prototype.redirect = function(location) {
		this.res.setHeader("Location", location);
		this.res.statusCode = 302;
	};

	// Find existent file to execute
	//
	Client.prototype.fileHandler = function(file, callback) {
		var client = this,
			application = client.application,
			fileName = file+'.js',
			filePath = client.hostDir+lastSlash(client.path)+fileName,
			fileExecute = application.cache.files[filePath];
		if (fileExecute) {
			if (fileExecute != impress.fileNotFound) client.execute(fileExecute, callback);
			else {
				// if (file != 'meta') client.error(404);
				callback();
			}
		} else impress.fs.exists(filePath, function(exists) {
			if (exists) {
				client.execute(filePath, callback);
				var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
				application.cache.files[fileOriginal] = filePath;
				impress.watchCache(application, fileOriginal);
			} else {
				// Try to process request on parent directory
				if ((client.path != '/') && (file != 'meta')) {
					client.path = impress.path.dirname(client.path);
					client.fileHandler(file, callback);
					var path = client.path;
					path = client.hostDir+path+(path.endsWith("/") ? "" : "/");
					impress.watchCache(application, path);
				} else {
					// Lose hope to execute request and drop connection
					// if (file != 'meta') client.error(404);
					callback();
					var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
					application.cache.files[fileOriginal] = impress.fileNotFound;
					impress.watchCache(application, fileOriginal);
				}
			}
		});
	};


	// Calculate access
	//
	Client.prototype.calculateAccess = function() {
		if (this.logged) {
			this.access.allowed = this.access.allowed && (
				(!this.access.groups) ||
				(this.access.groups &&
					(
						this.access.groups.length === 0 ||
						inArray(this.access.groups, this.user.group)
					)
				)
			);
		} else {
			this.access.allowed = (
				(
					(!this.logged && this.access.guests) ||
					(!!this.logged && this.access.logged)
				) && (
					(!!this.req.connection.server && this.access.http) ||
					(!this.req.connection.server && this.access.https)
				)
			);
		}
	};

	// Execute existent file from cache or disk
	//
	Client.prototype.execute = function(filePath, callback) {
		if (this.access.allowed) this.application.runScript(filePath, this, callback);
		else callback();
	};

	// Render template from file or cache
	//   callback(tpl)
	//
	Client.prototype.template = function(data, file, cursor, callback) {
		var client = this,
			application = client.application,
			fileName, filePath, fileInclude,
			files = [];
		if (client.logged) {
			if (client.user.group) files.push(file+'.'+client.user.group);
			files.push(file+'.everyone');
		}
		files.push(file);
		// Detect cache or file exists
		impress.async.detectSeries(files, function(item, callback) {
			fileName = item+'.template';
			filePath = client.hostDir+lastSlash(client.path)+fileName;
			fileInclude = application.cache.files[filePath];
			if (fileInclude) callback(true);
			else impress.fs.exists(filePath, callback);
		}, function(result) {
			if (fileInclude) {
				if (fileInclude != impress.fileNotFound) client.include(data, fileInclude, cursor, callback);
				else callback(impress.templateNotFound+file);
			} else if (result) {
				client.include(data, filePath, cursor, callback);
				var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
				application.cache.files[fileOriginal] = filePath;
				impress.watchCache(application, fileOriginal);
			} else {
				// Try to find template in parent directory
				if ((client.path != '/') && (client.path != '.')) {
					client.path = impress.path.dirname(client.path);
					client.template(data, file, cursor, callback);
					impress.watchCache(application, client.hostDir+client.path+(client.path.endsWith("/") ? "" : "/"));
				} else {
					// Lose hope to find template and save cache
					var fileOriginal = client.hostDir+lastSlash(client.url)+fileName;
					application.cache.files[fileOriginal] = impress.fileNotFound;
					impress.watchCache(application, fileOriginal);
					callback(impress.templateNotFound+file);
				}
			}
		});
	};

	// Include template
	//
	Client.prototype.include = function(data, filePath, cursor, callback) { // callback(tpl)
		var client = this,
			application = client.application,
			cache = application ? application.cache.templates[filePath] : null;
		if (cache) {
			if (cache != impress.fileIsEmpty) client.render(data, cache, cursor, callback);
			else callback(impress.fileIsEmpty);
		} else {
			impress.fs.readFile(filePath, 'utf8', function(err, tpl) {
				if (err) callback(impress.templateNotFound+filePath);
				else {
					if (!tpl) tpl = impress.fileIsEmpty; else {
						tpl = tpl.replace(/^[\uBBBF\uFEFF]/, '');
						if (!tpl) tpl = impress.fileIsEmpty;
					}
					if (application) application.cache.templates[filePath] = tpl;
					client.render(data, tpl, cursor, callback);
				}
			});
			impress.watchCache(application, filePath);
		}
	};

	// Render template from variable
	//
	Client.prototype.render = function(data, tpl, cursor, callback) { // callback(tpl)
		// parse template into structure
		if (tpl != impress.fileIsEmpty) {
			var structure = [],
				pos, tplInclude, dataInclude, tplBody, arrayIndex;
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
					dataInclude = impress.dataByPath(data,(cursor ? cursor+'.' : '')+tplInclude);
					// find inline templates
					pos = tpl.indexOf("@[/"+tplInclude+"]@");
					arrayIndex = 0;
					if (pos >= 0) {
						tplBody = tpl.substr(0, pos);
						if (Array.isArray(dataInclude)) {
							for (var dataItem in dataInclude) structure.push({
								type:'inline', name:tplInclude+'.'+arrayIndex++, tpl:tplBody
							});
						} else structure.push({type:'inline', name:tplInclude, tpl:tplBody});
						tpl = tpl.substring(pos+5+tplInclude.length);
					} else {
						// handle included templates
						if (Array.isArray(dataInclude)) {
							for (var dataItem in dataInclude) structure.push({
								type:'include', name:tplInclude+'.'+arrayIndex++
							});
						} else structure.push({ type:'include', name:tplInclude });
					}
				} else {
					structure.push({ type:'plain', tpl:tpl });
					tpl = '';
				}
			}
			// generate result from structure
			var result = '',
				client = this;
			impress.async.eachSeries(structure, function(item, callback) {
				var cursorNew;
				if (item.type == 'plain') {
					result += impress.subst(item.tpl, data, cursor);
					callback();
				} else if (item.type == 'inline') {
					cursorNew = (cursor === "") ? item.name : cursor+"."+item.name;
					client.render(data, item.tpl, cursorNew, function(tpl) {
						result += tpl;
						callback();
					});
				} else if (item.type == 'include') {
					cursorNew = (cursor === "") ? item.name : cursor+"."+item.name;
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
	};

	// Send static file
	//
	Client.prototype.static = function() {
		if (impress.path.basename(this.path) == 'access.js') this.error(403);
		else {
			var client = this,
				application = client.application,
				filePath = client.hostDir+client.path,
				httpCode = impress.customHttpCodes[client.typeExt] || 200,
				buffer = application.cache.static[filePath];
			if (buffer) {
				if (buffer != impress.fileNotFound) {
					var sinceTime = client.req.headers['if-modified-since'];
					if (sinceTime && impress.isTimeEqual(sinceTime, buffer.stats.mtime)) client.error(304);
					else {
						client.res.writeHead(httpCode, impress.baseHeader(client.typeExt, buffer.stats, buffer.compressed));
						client.end(buffer.data);
					}
				} else client.error(404);
			} else impress.fs.stat(filePath, function(err, stats) {
				if (err) {
					client.error(404);
					application.cache.static[filePath] = impress.fileNotFound;
					impress.watchCache(application, filePath);
				} else {
					var sinceTime = client.req.headers['if-modified-since'];
					if (sinceTime && impress.isTimeEqual(sinceTime, stats.mtime)) client.error(304);
					else {
						if (stats.isDirectory()) client.index(filePath);
						else impress.compress(filePath, stats, application, client, httpCode);
					}
				}
			});
		}
	};
	
} (global.impress = global.impress || {}));