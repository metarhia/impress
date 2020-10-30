'use strict';

const { node: { http, path } } = require('./dependencies.js');

const MIME_TYPES = {
  html: 'text/html; charset=UTF-8',
  json: 'application/json; charset=UTF-8',
  js: 'application/javascript; charset=UTF-8',
  css: 'text/css',
  png: 'image/png',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

const HEADERS = {
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubdomains; preload',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Security-Policy': [
    'default-src \'self\' ws:',
    'style-src \'self\' https://fonts.googleapis.com',
    'font-src \'self\' https://fonts.gstatic.com',
  ].join('; '),
};

class Client {
  constructor(connection) {
    this.callId = 0;
    this.connection = connection;
  }

  emit(name, data) {
    const packet = { event: --this.callId, [name]: data };
    this.connection.send(JSON.stringify(packet));
  }
}

class Channel {
  constructor(req, res, connection, application) {
    this.req = req;
    this.res = res;
    this.ip = req.socket.remoteAddress;
    this.connection = connection;
    this.application = application;
    this.client = new Client(connection);
    this.session = null;
    return this.init();
  }

  async init() {
    this.session = await this.application.auth.restore(this);
    return this;
  }

  static() {
    const { req: { url, method }, res, ip, application } = this;
    const filePath = url === '/' ? '/index.html' : url;
    const fileExt = path.extname(filePath).substring(1);
    const mimeType = MIME_TYPES[fileExt] || MIME_TYPES.html;
    res.writeHead(200, { ...HEADERS, 'Content-Type': mimeType });
    if (res.writableEnded) return;
    const data = application.getStaticFile(filePath);
    if (data) {
      res.end(data);
      application.logger.access(`${ip}\t${method}\t${url}`);
      return;
    }
    this.error(404);
  }

  redirect(location) {
    const { res } = this;
    if (res.headersSent) return;
    res.writeHead(302, { 'Location': location, ...HEADERS });
    res.end();
  }

  options() {
    const { res } = this;
    if (res.headersSent) return;
    res.writeHead(200, HEADERS);
    res.end();
  }

  error(code, err, callId = err) {
    const { req: { url, method }, res, connection, ip, application } = this;
    const status = http.STATUS_CODES[code];
    if (typeof err === 'number') err = undefined;
    const reason = err ? err.stack : status;
    application.logger.error(`${ip}\t${method}\t${url}\t${code}\t${reason}`);
    const { Error } = this.application;
    const message = err instanceof Error ? err.message : status;
    const error = { message, code };
    if (connection) {
      connection.send(JSON.stringify({ callback: callId, error }));
      return;
    }
    if (res.writableEnded) return;
    res.writeHead(code, { 'Content-Type': MIME_TYPES.json, ...HEADERS });
    res.end(JSON.stringify({ error }));
  }

  message(data) {
    let packet;
    try {
      packet = JSON.parse(data);
    } catch (err) {
      this.error(500, new Error('JSON parsing error'));
      return;
    }
    const [callType, target] = Object.keys(packet);
    const callId = packet[callType];
    const args = packet[target];
    if (callId && args) {
      const [interfaceName, methodName] = target.split('/');
      this.rpc(callId, interfaceName, methodName, args);
      return;
    }
    this.error(500, new Error('Packet structure error'));
  }

  async rpc(callId, interfaceName, methodName, args) {
    const { res, connection, ip, application, session, client } = this;
    const { semaphore } = application.server;
    try {
      await semaphore.enter();
    } catch {
      this.error(504, callId);
      return;
    }
    const [iname, ver = '*'] = interfaceName.split('.');
    try {
      const context = session ? session.context : { client };
      const proc = application.getMethod(iname, ver, methodName, context);
      if (!proc) {
        this.error(404, callId);
        return;
      }
      if (!this.session && proc.access !== 'public') {
        this.error(403, callId);
        return;
      }
      const result = await proc.method(args);
      if (result instanceof Error) {
        this.error(result.code, result, callId);
        return;
      }
      const userId = result ? result.userId : undefined;
      if (!this.session && userId && proc.access === 'public') {
        this.session = application.auth.start(this, userId);
        result.token = this.session.token;
      }
      const data = JSON.stringify({ callback: callId, result });
      if (connection) {
        connection.send(data);
      } else {
        res.writeHead(200, { 'Content-Type': MIME_TYPES.json, ...HEADERS });
        res.end(data);
      }
      const token = this.session ? this.session.token : 'anonymous';
      const record = `${ip}\t${token}\t${interfaceName}/${methodName}`;
      application.logger.access(record);
    } catch (err) {
      this.error(500, err, callId);
    } finally {
      semaphore.leave();
    }
  }
}

module.exports = { Channel };
