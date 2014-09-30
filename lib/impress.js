"use strict";

global.impress = {};
global.api = {};

api.console = console;
api.require = require;
api.os = require('os');
api.vm = require('vm');

impress.initContext = require('./global');
impress.initContext(global);

impress.callInContextScript = api.vm.createScript('callInContext(global);', 'impress.vm');
impress.callInContextMethod = function(context) {
  if (context && context.__callInContext) context.__callInContext(context);
};

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

// Impress core modules
//
require('./impress.constants');
require('./impress.utilities');
require('./impress.application');
require('./impress.client');

// Paths to directories
//
impress.dir = process.cwd().replace(/\\/g, '/');
impress.applicationsDir = impress.dir+'/applications';
impress.templatesDir = api.path.dirname(__dirname).replace(/\\/g, '/')+'/templates/';

process.on('uncaughtException', function(err) {
  if (impress.logException) impress.logException(err);
  else {
    console.log("Can't log uncaught Exception");
    console.log(err.stack);
  }
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
    if (impress.log && impress.log.error) impress.log.error('Warning: module '+moduleName+' is not installed');
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

// Load plugins
//
function loadPlugins() {
  if (impress.config.plugins) {
    if (api.cluster.isMaster && impress.config.plugins.indexOf('impress.log') === -1) {
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
  return (m1 === m2 || m1 === '*' || m2 === '*');
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
    if (err) {
      fatalError(impress.canNotReadDirectory+impress.applicationsDir);
      if (callback) callback();
    } else {
      var cbCount = apps.length,
          cbIndex = 0,
          cb = function() {
            compareHosts();
            if (++cbIndex>=cbCount && callback) callback();
          },
          appName, dir, stats, existsLink, linkFile, appLink;
      for (var i = 0; i < apps.length; i++) {
        appName = apps[i];
        dir = impress.applicationsDir+'/'+appName;
        stats = api.fs.statSync(dir);
        linkFile = dir+'/application.link';
        existsLink = api.fs.existsSync(linkFile);
        if (existsLink) {
          appLink = api.fs.readFileSync(linkFile, 'utf8');
          dir = impress.removeBOM(appLink);
        }
        (function() {
          if (stats.isDirectory() && (!impress.workerApplicationName || impress.workerApplicationName === appName)) {
            var application = new api.events.EventEmitter();
            application.Client = impress.createApplicationClientClass(application, {});
            extend(application, { name:appName, dir:dir });
            impress.mixinApplication(application, function() {
              application.loadConfig(function() {
                impress.applications[application.name] = application;
                application.preprocessConfig();
                impress.log.mixinApplication(application);
                application.log.open(function() {
                  application.loadPlaces(function () {
                    if (application.config.application) {
                      if (application.config.application.preload) application.preloadDirectory('/');
                      cb();
                    } else cb();
                  });
                });
              });
            });
          } else cb();
        } ());
      }
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
  impress.mixinApplication(impress, function() {
    impress.workerId = api.cluster.isMaster ? 0 : process.env['WORKER_ID'];
    impress.serverName = process.env['WORKER_SERVER_NAME'];
    if (api.cluster.isMaster) console.log('Impress Application Server'.bold.green+' starting, reading configuration'.green);
    impress.loadConfig(function() {
      impress.preprocessConfig();
      loadPlugins();
      impress.log.mixinApplication(impress);
      impress.log.open(function() {
        if (impress.workerId === 'long') {
          impress.nodeId = impress.config.cluster.name+'L'+process.pid;
          process.title = 'impress '+impress.nodeId;
          impress.processMarker = 'Worker'+'('+impress.nodeId+')';
          impress.workerApplicationName = process.env['WORKER_APPNAME'];
          impress.workerApplicationFile = process.env['WORKER_FILE'];
          impress.workerApplicationClient = JSON.parse(process.env['WORKER_CLIENT']);
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
    });

    function startup() {
      startIpc();
      loadApplications(function() {
        impress.server.emit('start');
        if (api.cluster.isMaster) {
          impress.log.server('Started');
          impress.server.emit('master');
        } else impress.server.emit('worker');
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
    for (var workerId in api.cluster.workers) {
      api.cluster.workers[workerId].kill();
    }
    console.log('Impress shutting down'.bold.green);
  }
  impress.log.close(function() {
    process.exit(0);
  });
};

// Start TCP, HTTP and HTTPS servers
//
function startServers() {
  var servers = impress.config.servers,
      workerId = 0,
      server, certificate, certDir;
  if (impress.config.cluster.strategy === 'sticky' && impress.isWin) {
    impress.config.cluster.strategy = 'single';
    if (master) console.log('Fallback to "single" strategy on windows, because "sticky" need named pipe'.red);
  }
  var single = impress.config.cluster.strategy === 'single',
      specialization = impress.config.cluster.strategy === 'specialization',
      sticky = impress.config.cluster.strategy === 'sticky',
      multiple = impress.config.cluster.strategy === 'multiple',
      cloned = multiple || sticky,
      master = api.cluster.isMaster;

  for (var serverName in servers) {
    server = servers[serverName];
    certificate = null;

    if (server.protocol === 'https') {
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
        if (server.protocol === 'https')
          server.listener = api.https.createServer(certificate, impress.dispatcher);
        else server.listener = api.http.createServer(impress.dispatcher);
        if (impress.websocket) impress.websocket.upgradeServer(server.listener);
      } else if (cloned) {
        if (sticky)
          server.listener = api.net.createServer(balancer);
        else server.listener = {
          close: function(callback) { callback(); },
          on: function() { },
          listen: function() { }
        };
      } else if (specialization && isFirstStart) impress.forkWorker(workerId++, serverName);
      console.log('  '+server.protocol.toUpperCase()+' listen on '+server.address+':'+server.port);
    } else if (cloned || impress.serverName === serverName) {
      if (server.protocol === 'https')
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
        if (server.address === '*') server.listener.listen(server.port);
        else server.listener.listen(server.port, server.address);
      } else {
        if (impress.config.cluster.strategy === 'sticky') server.listener.listen(null);
        else if (server.address === '*') server.listener.listen(server.port);
        else server.listener.listen(server.port, server.address);
      }
    }
  }
}  

// Start IPC
//
function startIpc() {
  process.on('SIGINT', impress.shutdown);
  process.on('SIGTERM', impress.shutdown);

  if (api.cluster.isMaster) {
    if (impress.config.cluster.strategy === 'multiple' || impress.config.cluster.strategy === 'sticky') {
      for (var workerId = 0; workerId < impress.config.cluster.workers; workerId++) {
        if (isFirstStart) impress.forkWorker(workerId);
      }
    }
  } else {
    // Receive events from master
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
      } else if (message.name === 'impress:event') {
        // Retranslate events from master to worker
        var application = impress.applications[message.appName];
        if (application) {
          /**/ if (message.user)    application.events.sendToUser(message.user, message.event, message.data, true);
          else if (message.channel) application.events.sendToChannel(message.channel, message.event, message.data, true);
          else if (message.global)  application.events.sendGlobal(message.event, message.data, true);
          else if (message.server)  application.events.sendToServer(message.event, message.data, true);
          // else if (message.cluster) application.events.sendToCluster(message.event, message.data, true);
        }
      } else if (message.name === 'impress:forklongworker') {
        // Add worker to array
      } else if (message.name === 'impress:killlongworker') {
        // Remove worker from array
      }
    });
  }
}

// Fork new worker
// bind worker to serverName from config if serverName defined
//
impress.forkWorker = function(workerId, serverName) {
  var worker, env = {};
  env['WORKER_ID'] = workerId+1;
  if (typeof(serverName) !== 'undefined') env['WORKER_SERVER_NAME'] = serverName;
  worker = api.cluster.fork(env);
  worker.nodeId = impress.config.cluster.name+'N'+(workerId+1);
  impress.stat.forkCount++;
  worker.on('exit', function(code, signal) {
    impress.stat.forkCount--;
    if (!worker.suicide) impress.forkWorker(workerId);
  });
  impress.listenWorker(worker);
};

// Fork long worker
//   appName    - application name to run worker in application context (config and database connections)
//   workerFile - filename with path
//   clientData - JSON serialized client request data
//
impress.forkLongWorker = function(appName, workerFile, clientData) {
  var application = impress.applications[appName];
  if (application) {
    var env = {};
    env['WORKER_ID'] = 'long';
    env['WORKER_FILE'] = workerFile;
    env['WORKER_APPNAME'] = appName;
    env['WORKER_CLIENT'] = clientData;
    var worker = api.cluster.fork(env);
    worker.file = workerFile;
    impress.listenWorker(worker);
    application.longWorkers[worker.id] = worker;
    impress.stat.forkCount++;
    worker.on('exit', function(code, signal) {
      impress.stat.forkCount--;
      delete application.longWorkers[worker.id];
    });
  }
};

// Kill long worker
//   appName    - application name
//   workerFile - filename with path
//
impress.killLongWorker = function(appName, workerFile) {
  var application = impress.applications[appName];
  if (application) {
    for (var id in application.longWorkers) {
      var worker = application.longWorkers[id];
      if (worker.file === workerFile) {
        worker.kill();
        impress.stat.forkCount++;
      }
    }
  }
};

// Initialize IPC for interprocess event routing
// Master receive events from workers here
//
impress.listenWorker = function(worker) {
  worker.on('message', function(message) {
    if (message.name === 'impress:event') { // propagate to all workers except of original sender
      impress.stat.eventCount++;
      if (api.cluster.isMaster && impress.config.cloud && (impress.config.cloud.type === 'server')) {
        impress.cloud.req.send(api.stringify(message));
      }
      impress.retranslateEvent(worker, message);
    } else if (message.name === 'impress:forklongworker') {
      impress.forkLongWorker(message.appName, message.workerFile, message.clientData);
      impress.retranslateEvent(worker, message);
    } else if (message.name === 'impress:killlongworker') {
      impress.killLongWorker(message.appName, message.workerFile);
      impress.retranslateEvent(worker, message);
    }
  });
};

// Retranslate IPC event to all workers except one
//
impress.retranslateEvent = function(exceptWorker, message) {
  for (var workerId in api.cluster.workers) {
    if (workerId !== exceptWorker.id+'') {
      api.cluster.workers[workerId].send(message);
    }
  }
};

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
            client.data = '';
            req.on('data', function(chunk) {
              client.data += chunk;
            });
            req.on('end', function() {
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
  if (impress.config.cluster.strategy === 'sticky') ip = ip2int(socket.remoteAddress);
  else if (impress.config.cluster.strategy === 'multiple') ip = ~~(Math.random()*impress.config.cluster.workers);

  var worker = api.cluster.workers[Math.abs(ip) % impress.config.cluster.workers],
      server = impress.config.servers[socket.server.serverName];
  worker.send({ name: 'impress:socket', address: server.address, port: server.port }, socket);
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

// Update changed file in cache
//
function updateFileCache(application, filePath, stats) {
  var ext = impress.fileExt(filePath);
  clearCacheStartingWith(application.cache.pages, filePath);
  if (filePath in application.cache.static) {
    // Replace static files memory cache
    application.compress(filePath, stats);
  } else if (ext === 'js' && (filePath in application.cache.scripts)) {
    // Replace changed js file in cache
    application.cache.scripts[filePath] = null;
    application.createScript(filePath, function(err, exports) {
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
  } else if (ext === 'template') {
    // Replace changed template file in cache
    delete application.cache.templates[filePath];
    delete application.cache.files[filePath];
    api.fs.readFile(filePath, 'utf8', function(err, tpl) {
      if (!err) {
        if (!tpl) tpl = impress.fileIsEmpty;
        else tpl = impress.removeBOM(tpl);
        application.cache.templates[filePath] = tpl;
      }
    });
  }
}

// Clear cache for all changed folders (created or deleted files)
//
function clieadDirectoryCache(application, filePath) {
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

// Cache watchers
//   filePath - absolute path to file or directory to watch
//
impress.watchCache = function(application, filePath) {
  var watcher, path = filePath;
  if (!filePath.endsWith('/')) path = api.path.dirname(path)+'/';
  if (application) {
    watcher = application.cache.watchers[path];
    if (!watcher) {
      api.fs.exists(path, function(exists) {
        if (exists) {
          watcher = api.fs.watch(path, function(event, fileName) {
            var filePath = (fileName) ? path+fileName : path,
                watcher = application.cache.watchers[path];
            if (watcher.timers[filePath]) clearTimeout(watcher.timers[filePath]);
            watcher.timers[filePath] = setTimeout(function() {
              api.fs.exists(filePath, function(exists) {
                if (exists) {
                  api.fs.stat(filePath, function(err, stats) {
                    if (err) return;
                    if (stats.isFile()) updateFileCache(application, filePath, stats);
                    else clieadDirectoryCache(application, filePath);
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
