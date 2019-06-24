'use strict';

const UNIX_EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT';
const COOKIE_EXPIRE = 'Fri, 01 Jan 2100 00:00:00 GMT';
const COOKIE_DELETE = `=deleted; Expires=${UNIX_EPOCH}; Path=/; Domain=`;

const DEFAULT_ACCESS = {
  guests: true, // allow access for non-authenticated connections
  logged: true, // allow access for authenticated connections
  http: true, // allow via HTTP
  https: true, // allow via HTTPS
  intro: false, // allow API introspection
  virtual: false, // allow virtual folders if true or reply 404 if false
  groups: [] // allow access for certain groups (empty list allows to all)
};

const STATUS_CODES = api.http.STATUS_CODES;
if (!STATUS_CODES[508]) STATUS_CODES[508] = 'Loop Detected';

const DEFAULT_SLOW_TIME = api.common.duration('2s');

// HTTP Client interface for Impress Application Server
// Properties:
//   startTime <Date> client's creation time
//   req <http.IncomingMessage>
//   res <http.ServerResponse>
//   websocket <Object> | <null> initialized
//       while processing a websocket request
//   socket <net.Socket> socket associated with the connection
//   server <Object> server instance
//   application <Application> instance of <Application>
//   dynamicHandler <boolean> whether client has been dispatched, default: false
//   query <Object> collection of key and value pairs from url query
//   schema <string> `https` if server's transport is `tls`, otherwise - `http`
//   method <string> the request method in lowercase
//   access <Object> client access options
//   fields <Object> parsed client data according to request content-type
//   files <Object> file uploads object, where the property names
//       are field names and the values are arrays of file objects
//   slowTime <number> client slow time in milliseconds
//   timedOut <boolean> whether the client hasn't been finished
//       before server timeout, default: `false`
//   finished <boolean> end response flag, default: `false`
//   url <string> the path portion of the request url
//   host <string> request host without port
//   path <string> the path portion of the request url
//       with trailing slash at the end if there isn't one
//   pathDir <string> absolute path to path in request url
//       in application's `www` directory
//       (e.g. `/ias/applications/example/www/path/to/dir`)
//   realPath <string> path to the nearest existent folder
//   realPathDir <string> absolute path to the nearest existent folder
//       in application's `www` directory
//   execPath <string> path to the nearest directory
//   execPathDir <string> absolute path to the nearest directory
//       with handler script file for the request
//       in application's `www` directory
//   ext <string> extension of file in the path portion of the request url
//   typeExt <string> extension type of returned data
//   data <string> data received from client
//   context <Object> client context
//   ip <string> | <undefined> remote IP address
//   cookies <Object> received cookies
//   preparedCookies <string[]> prepared cookies to send
//   ipInt <number> | <undefined> remote IP address converted to number,
//       if no IP address - `undefined`
//   local <boolean> local network interface flag
//   session <Session> | <null> client session
//   sessionCreated <boolean> session creation flag, default: `false`
//   sessionModified <boolean> session modification flag, default: `false`
//   logged <boolean> whether the user is logged in, default: `false`
//   currentHandler <string> current handler name
//       (e.g. `access`, `get`, `post` etc.)
class Client {

  // Client constructor
  //   application <Application> instance of impress.Application
  //   req <http.IncomingMessage>
  //   res <http.ServerResponse>
  constructor(application, req, res) {
    const socket = req.socket || req.connection.socket;
    const server = impress.server;
    const url = api.url.parse(req.url);
    const config = server.config;

    req.connection.client = this;

    this.startTime = Date.now();
    this.req = req;
    this.res = res;
    this.websocket = null;
    this.socket = socket;
    this.server = server;
    this.application = application;
    this.dynamicHandler = false;
    this.query = api.querystring.parse(url.query);
    this.schema = config.transport === 'tls' ? 'https' : 'http';
    this.method = req.method.toLowerCase();
    this.access = { ...DEFAULT_ACCESS };
    this.calculateAccess();
    this.fields = null;
    this.files = null;
    this.slowTime = config.slowTime || DEFAULT_SLOW_TIME;
    this.timedOut = false;
    this.finished = false;
    this.url = url.pathname;
    this.host = api.common.parseHost(req.headers.host);
    this.path = api.common.addTrailingSlash(this.url);
    this.pathDir = api.path.join(application.dir, 'www', this.path);
    this.realPath = this.path;
    this.realPathDir = this.pathDir;
    this.execPath = this.path;
    this.execPathDir = this.pathDir;
    this.ext = api.common.fileExt(this.path);
    this.typeExt = this.ext || 'html';
    this.data = '';
    this.context = {};
    this.chunks = [];
    this.ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      socket.remoteAddress;
    this.cookies = {};
    this.preparedCookies = [];

    if (res.setHeader) {
      const contentType = impress.MIME_TYPES[this.typeExt];
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public');
      const timeout = Math.round(server.keepAlive / 1000);
      res.setHeader('Keep-Alive', 'timeout=' + timeout);
    }
    if (this.ip) {
      const ip = api.net.isIPv6(this.ip) ? this.ip.slice(7) : this.ip;
      this.ipInt = api.common.ipToInt(ip);
      application.emit('clientConnect', this);
      this.local = api.common.localIPs().includes(this.ip);
    } else {
      this.ipInt = undefined;
      this.local = false;
    }

    this.session = null;
    this.sessionCreated = false;
    this.sessionModified = false;
    this.logged = false;
    this.currentHandler = undefined;

    // Socket leak workaround
    res.on('finish', () => {
      application.emit('clientDisconnect', this);
      socket.removeAllListeners('timeout');
      socket.setTimeout(server.keepAlive, () => {
        socket.destroy();
      });
    });
  }

  // Convert cookie string from request's headers to `client.cookies` object
  //
  // Example: 'name=value; path=/' => { name: 'value', path: '/' }
  parseCookies() {
    const cookie = this.req.headers.cookie;
    if (cookie) {
      const cookies = cookie.split(';');
      for (const item of cookies) {
        const parts = item.split('=');
        const key = parts[0].trim();
        const val = parts[1] || '';
        this.cookies[key] = val.trim();
      }
    }
  }

  // Set cookie by adding it to `client.preparedCookies`
  //   name <string> cookie name
  //   value <string> cookie value
  //   host <string> host name, optional, default: client.req.headers.host
  //   httpOnly <boolean> HttpOnly cookie modifier, optional, default: true
  setCookie(name, value, hostname, httpOnly = true) {
    const expires = `expires=${COOKIE_EXPIRE}`;
    const hostport = hostname || this.req.headers.host;
    const pos = hostport.indexOf(':');
    const host = pos > -1 ? hostport.substring(0, pos) : hostport;
    let cookie = `${name}=${value}; ${expires}; Path=/; Domain=${host}`;
    if (httpOnly) cookie += '; HttpOnly';
    this.preparedCookies.push(cookie);
  }

  // Delete cookie
  //   name <string> cookie name
  //   host <string> optional, default: client.req.headers.host
  deleteCookie(name, host) {
    let aHost = host || this.req.headers.host;
    if (api.net.isIP(aHost) === 0) aHost = '.' + aHost;
    this.preparedCookies.push(name + COOKIE_DELETE + aHost);
  }

  // Set all prepared cookies if headers have not been sent yet
  sendCookie() {
    const prepared = this.preparedCookies;
    if (prepared && !this.res.headersSent) {
      this.res.setHeader('Set-Cookie', prepared);
    }
  }

  // Route request to external HTTP server
  //   hostname <string> forward request to host name or IP address
  //   port <number> request port
  //   path <string> request path
  proxy(hostname, port, path) {
    const target = { hostname, port, path, method: this.req.method };
    const req = api.http.request(target, response => {
      this.res.writeHead(response.statusCode, response.headers);
      response.on('data', chunk => {
        this.res.write(chunk);
      });
      response.on('end', () => {
        this.end();
      });
    });
    req.on('error', err => {
      this.application.log.error(`Error proxying request: ${err.message}`);
    });
    req.end();
    impress.stat.res++;
  }

  // Client dispatch.
  // Check application firewall access, in case if access is allowed
  // parse cookies, restore client session and process request.
  // Otherwise following status codes can be sent:
  // - `403 Forbidden` client error status response code if access denied
  // - `429 Too Many Requests` response status code if access limited
  // - `400 Bad Request` response status code in other cases
  dispatch() {
    this.dynamicHandler = true;
    this.parseCookies();
    // TODO: Temporary disable application firewall
    //       to refactor security subsystem and sessions
    // const code = api.firewall.check(this);
    // if (code === api.firewall.ACCESS_ALLOWED) {
    this.application.security.restoreSession(this, () => {
      this.detectRealPath(() => {
        this.processing();
      });
    });
    // } else if (code === api.firewall.ACCESS_DENIED) {
    //   this.error(403);
    // } else if (code === api.firewall.ACCESS_LIMITED) {
    //   this.error(429);
    // } else {
    //   this.error(400);
    // }
  }

  // Add current client to deny list by IP and Token if session exists.
  // Send `403 Forbidden` client error status response code afterwards
  //   msec <number> | <string> milliseconds or duration of client blocking
  block(/*msec*/) {
    this.error(403);
    // TODO: Temporary disable application firewall
    //       to refactor security subsystem and sessions
    // const duration = api.common.duration(msec) || 0;
    // api.firewall.ip.deny(this.ipInt, duration);
    // if (this.session) {
    //   api.firewall.token.deny(this.session.token, duration);
    // }
  }

  // Process request.
  // If requested page is already cached, send it and end response.
  // Otherwise check client access and execute an appropriate
  // handler file for request's method, end response accordingly
  processing() {
    const cache = this.application.cache.pages[this.realPath];
    if (cache && this.startTime < cache.expireTime) {
      this.sendCache(cache);
      return;
    }
    if (!this.ext) {
      this.ext = api.common.fileExt(this.realPath);
      this.typeExt = this.ext || 'html';
    }
    this.defaultContentType();
    if (this.ext === 'ws') {
      api.websocket.initialize(this);
    }

    this.fileHandler('access', false, () => {
      if (!this.access.allowed) {
        this.error(403);
        return;
      }
      if (this.path !== this.realPath && !this.access.virtual) {
        this.error(404);
        return;
      }
      this.execPath = this.realPath;
      this.execPathDir = this.realPathDir;
      this.fileHandler(this.method, false, err => {
        if (this.finished) return;
        if (err) {
          this.error(404);
          return;
        }
        if (this.access.auth && !this.local) {
          this.basicAuth();
          return;
        }
        if (this.ext === '' && this.access.intro) {
          this.introspect();
          return;
        }
        const ext = impress.extensions;
        const extCase = ext[this.typeExt] || ext.html;
        extCase(this);
      });
    });
  }

  // Handle basic access authentication.
  // Check authorization base64 encoded credentials if
  // client request contains `Authorization` header.
  // In case check failed or `Authorization` header has not been set,
  // send `401 Unauthorized` client error status response code along
  // with `WWW-Authenticate` header.
  // As long as base64 is a reversible encoding, the basic authentication
  // is not secure, so HTTPS/TLS should be used in combination
  // with basic authentication for additional security.
  basicAuth() {
    let authBase64 = this.req.headers.authorization;
    let authAllowed = false;
    if (authBase64) {
      authBase64 = authBase64.substring(6);
      const auth = Buffer.from(authBase64, 'base64');
      authAllowed = this.access.auth === auth.toString();
    }
    if (!authAllowed) {
      const realm = this.access.realm || 'Restricted';
      this.res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      this.error(401);
    }
  }

  // Specify an allowed origin.
  // Set `Access-Control-Allow-Origin` header
  // if application config defines allowOrigin, default: not set
  allowOrigin() {
    const config = this.application.config.sections.application;
    if (config) {
      const origin = config.allowOrigin;
      if (origin) {
        const headers = 'origin, content-type, accept';
        this.res.setHeader('Access-Control-Allow-Origin', origin);
        this.res.setHeader('Access-Control-Allow-Headers', headers);
      }
    }
  }

  // Set `Content-Type` header with an appropriate MIME type of returned data
  defaultContentType() {
    const contentType = impress.MIME_TYPES[this.typeExt];
    if (contentType) {
      this.res.setHeader('Content-Type', contentType);
    }
    this.allowOrigin();
  }

  // Process HTML page by sending html template and ending response.
  // If cannot read template file, `500 Internal Server Error`
  // server error response code is sent
  processingPage() {
    this.execPath = this.realPath;
    this.execPathDir = this.realPathDir;
    this.template('html', (err, tpl) => {
      if (err) {
        this.error(500);
        return;
      }
      this.end(tpl);
    });
  }

  // Cache URL response
  //   timeout <number> | <string> milliseconds or duration
  cache(timeout) {
    this.context.cache = api.common.duration(timeout);
  }

  // End response
  //   output <string> | <Buffer> | <Object>
  //     stats <fs.Stats> instance of fs.Stats
  //     compressed <boolean> gzip compression flag
  //     data <Buffer> to send
  end(output) {
    if (this.finished) return;
    this.finished = true;

    const isString = typeof output === 'string';
    const isBuffer = Buffer.isBuffer(output);
    const isUndef = output === undefined;
    const cache = isString || isBuffer || isUndef ? { data: output } : output;
    const length = cache && cache.data ? cache.data.length : 0;

    const done = () => {
      const res = this.res;
      this.sendCookie();
      if (!res.headersSent) {
        if (cache.stats) {
          res.setHeader('Content-Length', cache.stats.size);
          res.setHeader('Last-Modified', cache.stats.mtime.toUTCString());
        }
        if (cache.compressed) res.setHeader('Content-Encoding', 'gzip');
      }
      if (isString && length > impress.COMPRESS_ABOVE) {
        if (res.headersSent) {
          res.end();
          return;
        }
        api.zlib.gzip(cache.data, (err, data) => {
          if (err) {
            this.error(500);
            return;
          }
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', data.length);
          res.end(data);
          if (this.context && this.context.cache) this.saveCache(data);
        });
      } else {
        res.end(cache.data);
        if (this.context && this.context.cache) this.saveCache(cache.data);
      }
      impress.accessLog(this);
      impress.stat.res++;
    };

    // TODO: impress.application
    if (this.application === impress) {
      done();
      return;
    }
    this.application.security.saveSession(this, done);
  }

  // Save cache in `client.application.cache.pages`
  //   data <string>
  saveCache(data) {
    const now = new Date();
    const mtime = now.getTime();
    const time = now.toUTCString();

    this.application.cache.pages[this.realPath] = {
      expireTime: this.startTime + this.context.cache,
      statusCode: this.res.statusCode,
      contentType: this.res.getHeader('content-type'),
      contentEncoding: this.res.getHeader('content-encoding'),
      stats: { size: data.length, mtime, time },
      data,
    };
  }

  // Send cache data. Set appropriate headers and end response
  //   cache <Object>
  //     expireTime <number> cache expiration time
  //     statusCode <number> response status code
  //     contentType <string> data type, `Content-Type` header
  //     contentEncoding <string> data encoding, `Content-Encoding` header
  //     stats <Object>
  //       size <number> data length, `Content-Length` header
  //       mtime <number> | <BigInt> last modified in milliseconds
  //       time <string> `Last-Modified` header
  //     data <string>
  sendCache(cache) {
    const res = this.res;
    res.statusCode = cache.statusCode;
    const { contentType, contentEncoding, stats } = cache;
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentEncoding) {
      res.setHeader('Content-Encoding', contentEncoding);
    }
    if (stats) {
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Last-Modified', stats.time);
    }
    this.end(cache.data);
  }

  // End response with HTTP error code
  //   code <number> HTTP status code
  //   message <string> error message, optional
  error(code, message = STATUS_CODES[code]) {
    this.res.statusCode = code;
    if (this.typeExt === 'json') {
      this.end(`{"statusCode":${code},"message":"${message}"}`);
      return;
    }
    if (!this.res.headersSent) {
      this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
    }
    const title = 'Error ' + code;
    const template = impress.systemTemplates.error;
    this.end(template(title, message));
  }

  // Redirect to specified location.
  // `Location` header would be set in case headers have not sent yet.
  //   location <string> URL to redirect a page to
  redirect(location) {
    if (!this.res.headersSent) {
      this.res.setHeader('Location', location);
      this.res.statusCode = 302;
    }
  }

  // Inherit behavior from parent directory
  //   callback <Function> after inherited handler
  //     err <Error>
  inherited(callback) {
    if (this.execPath === '/') {
      callback(new Error('Handler is not found'));
      return;
    }
    const path = api.common.dirname(this.execPath) + '/';
    this.execPath = path;
    this.execPathDir = api.path.join(this.application.dir, 'www', path);
    this.fileHandler(this.currentHandler, true, callback);
  }

  // Execute handler script file for the request.
  // Run an appropriate handler file for request method(get, post, put,
  // delete, patch, head) or access handler for access configuration.
  // Files should be named in accordance to method it handles (e.g. `get.js`)
  //   handler <string> handler name (e.g. `access`, `get`, `post` etc.)
  //   inheritance <boolean> flag, true if called from inherited
  //   callback <Function> after fileHandler executed
  //     err <Error>
  fileHandler(handler, inheritance, callback) {
    const application = this.application;

    const fileName = handler + '.js';
    const filePath = this.execPathDir + fileName;
    const relPath = application.relative(filePath);
    const fileCache = application.cache.files.get(relPath);

    if (!inheritance) this.currentHandler = handler;

    if (fileCache) {
      if (fileCache === impress.FILE_EXISTS) {
        this.runScript(handler, filePath, callback);
      } else if (this.execPath !== '/') {
        this.execPath = api.common.dirname(this.execPath);
        this.execPathDir = api.path.join(application.dir, 'www', this.execPath);
        this.fileHandler(handler, inheritance, callback);
      } else {
        callback(new Error('Handler not found'));
      }
      return;
    }
    api.fs.access(filePath, err => {
      if (!err) {
        application.cache.files.set(relPath, impress.FILE_EXISTS);
        this.runScript(handler, filePath, callback);
        application.cache.watch(api.path.dirname(relPath));
        return;
      }
      application.cache.files.set(relPath, impress.FILE_NOT_FOUND);
      if (this.execPath !== '/') {
        this.execPath = api.common.dirname(this.execPath);
        this.execPathDir = api.path.join(application.dir, 'www', this.execPath);
        this.fileHandler(handler, inheritance, callback);
        application.cache.watch('/www' + this.execPath);
        return;
      }
      application.cache.watch(api.path.dirname(relPath));
      callback(new Error('Handler not found'));
    });
  }

  // Find nearest existent folder
  //   callback <Function> after path detected
  detectRealPath(callback) {
    const application = this.application;

    const relPath = application.relative(this.realPathDir);
    const folderCache = application.cache.folders.get(relPath);

    const detected = folderCache &&
      folderCache !== impress.DIR_NOT_EXISTS ||
      this.realPath === '/';

    if (detected) {
      callback();
      return;
    }

    api.fs.access(this.realPathDir, err => {
      if (err) {
        application.cache.folders.set(relPath, impress.DIR_NOT_EXISTS);
        this.realPath = api.common.dirname(this.realPath);
        this.realPathDir = api.path.join(application.dir, 'www', this.realPath);
        this.detectRealPath(callback);
      } else {
        application.cache.folders.set(relPath, impress.DIR_EXISTS);
        callback();
      }
    });
    application.cache.watch(api.common.stripTrailingSlash(relPath));
  }

  // Check whether access is allowed or not based on `client.access` options.
  // Default access options:
  // - guests, allow access for non-authenticated connections - `true`
  // - logged, allow access for authenticated connections - `true`
  // - http, allow via HTTP - `true`
  // - https, allow via HTTPS -  `true`
  // - intro, allow API introspection - `false`
  // - virtual, allow virtual folders otherwise reply with 404 - `false`
  // - groups, allow access for certain groups, empty allows for all - `[]`
  calculateAccess() {
    this.access.allowed = (
      (!this.logged && this.access.guests) ||
      (!!this.logged && this.access.logged)) && (
      (this.schema === 'http' && this.access.http) ||
      (this.schema === 'https' && this.access.https));
    if (this.logged) {
      this.access.allowed = this.access.allowed &&
        (!this.access.groups || (this.access.groups && (
          this.access.groups.length === 0 ||
          this.access.groups.includes(this.session.group) ||
          this.access.groups.includes('local') && this.local
        )));
    }
  }

  // Run script in client context if access is allowed.
  // Configure access options if `access`.
  // Otherwise execute function from handler file
  //   handler <string> handler name
  //   fileName <string> file name
  //   callback <Function> after handler executed
  //     err <Error>
  runScript(handler, fileName, callback) {
    impress.createScript(this.application, fileName, (err, fn) => {
      if (err) {
        this.application.log.error(impress.CANT_READ_FILE + fileName);
        callback(err);
        return;
      }
      if (handler === 'access') {
        Object.assign(this.access, fn);
        this.calculateAccess();
        callback(null);
        return;
      }
      if (!this.access.allowed) {
        callback(null);
        return;
      }
      this.executeFunction(fn, callback);
    });
  }

  // Execute function in client context
  //   fn <Function> to be executed
  //   callback <Function>
  //     err <Error>
  executeFunction(fn, callback) {
    const application = this.application;

    if (typeof fn !== 'function') {
      const err = new Error('Invalid handler');
      this.error(500);
      application.logException(err);
      callback(err);
      return;
    }

    let waiting = true;

    const done = (err, result) => {
      if (waiting) {
        waiting = false;
        if (result) this.context.data = result;
        if (err) {
          if (this.res.statusCode === 200) {
            this.error(500);
          }
          application.logException(err);
          callback(err);
          return;
        }
        callback(null);
      }
    };

    if (Object.prototype.toString.call(fn) === '[object AsyncFunction]') {
      fn(this).then(result => {
        done(null, result);
      }, err => {
        done(err);
      });
      return;
    }
    try {
      fn(this, done);
    } catch (err) {
      done(err);
    }
  }

  // Send static file and close connection
  //   onNotServed <Function> execute if file is not static
  static(onNotServed) {
    const basePath = '/static';
    let relPath = '/static/index.html';
    if (this.path !== '/') {
      const url = api.querystring.unescape(this.url);
      const safePath = api.path.join(basePath, url);
      if (safePath.startsWith(basePath)) relPath = safePath;
    }
    if (!this.staticCache(relPath, onNotServed)) {
      this.serveStatic(relPath, onNotServed);
    }
  }

  // Send static data from `client.application.cache.static`
  //   relPath <string> relative path is a cash index
  //   onNotServed <Function> if not served
  staticCache(relPath, onNotServed) {
    const cache = this.application.cache.static.get(relPath);
    const isNum = typeof cache === 'number';
    const cached = cache && !isNum;
    if (cached) this.buffer(cache);
    else if (isNum) onNotServed();
    return cached;
  }

  // Serve static file
  //   relPath <string> application relative path to file
  //   onNotServed <Function> if not static
  serveStatic(relPath, onNotServed) {
    const application = this.application;

    const gz = '.gz';
    const filePath = application.dir + relPath;
    const isCompressed = impress.COMPRESSED_EXT.includes(this.ext);

    const serveFile = (err, stats) => {
      if (err) {
        onNotServed();
        application.cache.watch(api.path.dirname(relPath));
        return;
      }
      if (stats.isDirectory()) {
        if (!this.staticCache(relPath, onNotServed)) {
          this.index(filePath);
        }
        return;
      }
      const { cacheMaxFileSize } = application.config.sections.files;
      if (stats.size < cacheMaxFileSize) this.compress(filePath, stats);
      else this.stream(filePath, stats);
    };

    const serveGzip = (err, stats) => {
      if (err) api.fs.stat(filePath, serveFile);
      else this.staticFile(filePath + gz, relPath + gz, stats);
    };

    if (isCompressed) api.fs.stat(filePath, serveFile);
    else api.fs.stat(filePath + gz, serveGzip);
  }

  // Send compressed static file and end response.
  // If the file cannot be read `404 Not Found`
  // client error status response code is sent
  //   filePath <string> absolute path to file
  //   relPath <string> application relative path to file
  //   stats <fs.Stats> instance of fs.Stats
  staticFile(filePath, relPath, stats) {
    api.fs.readFile(filePath, (err, data) => {
      if (err) {
        this.error(404);
        return;
      }
      const cache = { stats, compressed: true, data };
      this.end(cache);
      this.application.cache.static.add(relPath, cache);
    });
  }

  // Send static buffer and end response.
  // If cache was not modified `304 Not Modified`
  // client redirection response code is sent
  //   cache <Object>
  //     stats <fs.Stats> instance of fs.Stats
  //     compressed <boolean> gzip compression flag
  //     data <Buffer> to send
  buffer(cache) {
    const time = this.req.headers['if-modified-since'];
    const notMod = time && api.common.isTimeEqual(time, cache.stats.mtime);
    if (notMod) this.error(304);
    else this.end(cache);
  }

  // Refresh static in memory cache with compression and minification.
  // If cache was not modified, `304 Not Modified` client redirection
  // response code is sent. If cannot read file, `404 Not Found` client error
  // status response code is sent
  //   filePath <string> path to handler (from application base directory)
  //   stats <fs.Stats> instance of fs.Stats
  compress(filePath, stats) {
    const time = this.req.headers['if-modified-since'];
    const notMod = time && api.common.isTimeEqual(time, stats.mtime);
    if (notMod) {
      this.error(304);
      return;
    }
    this.application.compress(filePath, stats, (err, data, compressed) => {
      if (err) {
        this.error(404);
        return;
      }
      this.end({ stats, compressed, data });
    });
  }

  // File upload and download utilities for Impress Application Server

  // Generate HTTP file attachment
  //   attachmentName <string> name to save downloaded file
  //   size <number> set Content-Length header, optional
  //   lastModified <string> set Last-Modified header, optional
  attachment(attachmentName, size, lastModified) {
    const res = this.res;
    res.setHeader('Content-Description', 'File Transfer');
    res.setHeader('Content-Type', 'application/x-download');
    const fileName = `attachment; filename="${attachmentName}"`;
    res.setHeader('Content-Disposition', fileName);
    res.setHeader('Expires', 0);
    const cacheControl = 'no-cache, no-store, max-age=0, must-revalidate';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Pragma', 'no-cache');
    if (size) {
      res.setHeader('Content-Length', size);
      res.setHeader('Content-Transfer-Encoding', 'binary');
    }
    if (lastModified) res.setHeader('Last-Modified', lastModified);
  }

  // Download file generating a file attachment.
  // If cannot read file, `404 Not Found`
  // client error status response code is sent
  //   filePath <string> file to download
  //   attachmentName <string> name to save downloaded file,
  //       optional, default: basename of filePath
  //   callback <Function> after file downloaded
  download(filePath, attachmentName, callback) {
    if (typeof attachmentName === 'function') {
      callback = attachmentName;
      attachmentName = api.path.basename(filePath);
    }
    callback = api.common.once(callback);

    const fail = () => {
      this.application.log.error(impress.CANT_READ_FILE + filePath);
      this.error(404);
      callback();
    };

    const done = () => {
      this.finished = true;
      callback();
    };

    api.fs.stat(filePath, (err, stats) => {
      if (err) {
        fail();
        return;
      }
      this.attachment(attachmentName, stats.size, stats.mtime.toUTCString());
      const stream = api.fs.createReadStream(filePath);
      stream.on('error', fail);
      this.res.on('finish', done);
      stream.pipe(this.res);
    });
  }

  // Upload file
  //   each <Function> on processing each file
  //     err <Error>
  //     data <Object>
  //       compressionFlag <string> how file was compressed
  //           `N`(not compressed), `Z`(zip compressed), `G`(gzip compressed)
  //       originalName <string> filename
  //       storageName <string> generated key
  //       storagePath <string> storage path
  //       originalHash <string> hash
  //       originalSize <number> size of file in bytes
  //       storageSize <number> size of file in bytes
  //   callback <Function>
  //     err <Error>
  //     count <number> amount of files
  upload(each, callback) {
    if (!this.files) {
      callback(null, 0);
      return;
    }

    let fileCount = 0;
    let count = 0;

    const done = (err, data) => {
      count++;
      if (each) each(err, data);
      if (fileCount === count) callback(null, count);
    };

    for (const fieldName in this.files) {
      const field = this.files[fieldName];
      for (const key in field) {
        const file = field[key];
        fileCount++;
        impress.uploadFile(this.application, file, done);
      }
    }
  }

  // Sending file stream
  //   filePath <string> absolute path to file
  //   stats <fs.Stats> instance of fs.Stats
  stream(filePath, stats) {
    const res = this.res;
    let stream;
    const range = this.req.headers.range;
    if (range) {
      const index = range.indexOf('-');
      const start = parseInt(range.slice('bytes='.length, index), 10);
      const end = index === range.length - 1 ?
        stats.size - 1 :
        parseInt(range.slice(index + 1), 10);
      const chunkSize = (end - start) + 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', stats.size);
      res.setHeader('Content-Length', chunkSize);
      const cRange = `bytes ${start}-${end}/${stats.size}`;
      res.setHeader('Content-Range', cRange);
      res.setHeader('Accept-Ranges', 'bytes');
      stream = api.fs.createReadStream(filePath, { start, end });
    } else {
      this.allowOrigin();
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Last-Modified', stats.mtime.toUTCString());
      stream = api.fs.createReadStream(filePath);
    }

    stream.on('open', () => {
      stream.pipe(this.res);
    });

    stream.on('error', () => {
      this.application.log.error(impress.CANT_READ_FILE + filePath);
    });
  }

  // Send HTML template with directory index, end response.
  // If in application's static files configuration `index` is set
  // to `false` (allowed displaying HTTP directory index for /static if true)
  // `403 Forbidden` client error status response code is sent
  //   indexPath <string> path to directory
  index(indexPath) {
    const application = this.application;

    if (!this.url.endsWith('/')) {
      this.redirect(this.path);
      this.end();
      return;
    }

    this.execPath = this.realPath;
    this.execPathDir = this.realPathDir;
    this.fileHandler('access', false, err => {
      if (err || !application.config.sections.files.index) {
        this.error(403);
        return;
      }
      if (!this.res.headersSent) {
        this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
      }
      impress.dirIndex(
        application, indexPath, this.realPath, (err, files, dirs) => {
          const template = impress.systemTemplates.index;
          const fileTpl = impress.systemTemplates.file;
          const rows = files.map(
            ({ name, path, size, mtime }) => fileTpl(name, path, size, mtime)
          ).join('');
          const items = dirs.map(
            ({ name, path }) => `<a href="/${path}">${name}</a>`
          ).join('/');
          this.end(template('Directory index', this.url, rows, items));
        }
      );
    });
  }

  // Send HTML template with API introspection index, end response.
  // Called if in client access configuration `intro` is set to `true`.
  // If cannot read directory by client.path, `404 Not Found` client error
  // status response code is sent
  introspect() {
    if (!this.req.url.endsWith('/')) {
      this.redirect(this.path);
      this.end();
      return;
    }
    const application = this.application;
    const path = this.path;
    impress.dirIntrospect(application, path, (err, files, dirs) => {
      if (err) {
        this.error(404);
        return;
      }
      const template = impress.systemTemplates.introspection;
      const fileTpl = impress.systemTemplates.file;
      const rows = files.map(
        ({ name, path, method, mtime }) => fileTpl(name, path, method, mtime)
      ).join('');
      const items = dirs.map(
        ({ name, path }) => `<a href="/${path}">${name}</a>`
      ).join('/');
      this.end(template('API Introspection index', this.url, rows, items));
    });
  }

  // Render template from file or return template from cache if it exists
  //   file <string> template file name
  //   callback <Function>
  //     err <Error>
  //     res <string> requested template
  template(file, callback) {
    const application = this.application;

    const fileName = file + '.template';
    const filePath = this.execPathDir + fileName;
    const relPath = application.relative(filePath);
    const fileCache = application.cache.templates.get(relPath);
    if (fileCache) {
      callback(null, fileCache);
      return;
    }
    api.fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        application.log.error(impress.CANT_READ_FILE + filePath);
        callback(err);
        return;
      }
      const tpl = api.common.removeBOM(data);
      application.cache.templates.add(relPath, tpl);
      callback(null, tpl);
    });
    application.cache.watch(api.path.dirname(relPath));
  }

}

impress.Client = Client;
module.exports = { Client };
