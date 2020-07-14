'use strict';

const { http, path } = require('./dependencies.js');
const application = require('./application.js');

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
  'Content-Security-Policy': [
    'default-src \'self\'',
    'style-src \'self\' https://fonts.googleapis.com',
    'font-src \'self\' https://fonts.gstatic.com',
  ].join('; '),
};

class Client {
  constructor(req, res, connection) {
    this.req = req;
    this.res = res;
    this.connection = connection;
  }

  static() {
    const { req: { url }, res } = this;
    const filePath = url === '/' ? '/index.html' : url;
    const fileExt = path.extname(filePath).substring(1);
    const mimeType = MIME_TYPES[fileExt] || MIME_TYPES.html;
    res.writeHead(200, { ...HEADERS, 'Content-Type': mimeType });
    const data = application.static.get(filePath);
    if (data) res.end(data);
    else this.error(404);
  }

  redirect(location) {
    const { res } = this;
    if (res.headersSent) return;
    res.writeHead(302, { 'Location': location });
    res.end();
  }

  error(status, err) {
    const { req: { url }, res, connection } = this;
    const reason = http.STATUS_CODES[status];
    const error = err ? err.stack : reason;
    const msg = status === 403 ? err.message : `${url} - ${error} - ${status}`;
    application.logger.error(msg);
    const result = JSON.stringify({ result: 'error', reason });
    if (connection) {
      connection.send(result);
      return;
    }
    if (res.finished) return;
    res.writeHead(status, { 'Content-Type': MIME_TYPES.json });
    res.end(result);
  }

  message(data) {
    const packet = JSON.parse(data);
    const [callType, target] = Object.keys(packet);
    const callId = packet[callType];
    const args = packet[target];
    const [interfaceName, methodName] = target.split('/');
    this.rpc(callId, interfaceName, methodName, args);
  }

  async rpc(callId, interfaceName, methodName, args) {
    const { res, connection } = this;
    const { semaphore } = application.server;
    try {
      await semaphore.enter();
    } catch {
      this.error(504);
      return;
    }
    const [iname, ver = '*'] = interfaceName.split('.');
    try {
      const session = await application.auth.restore(this);
      const proc = application.runMethod(iname, ver, methodName, session);
      if (!proc) {
        this.error(404);
        return;
      }
      if (!session && proc.access !== 'public') {
        const err = new Error(`Forbidden: ${interfaceName}/${methodName}`);
        this.error(403, err);
        return;
      }
      const result = await proc.method(args);
      const { userId } = result;
      if (!session && userId && proc.access === 'public') {
        const session = application.auth.start(this, userId);
        result.token = session.token;
      }
      const data = JSON.stringify({ callback: callId, result });
      if (connection) connection.send(data);
      else res.end(data);
    } catch (err) {
      this.error(500, err);
    } finally {
      semaphore.leave();
    }
  }
}

module.exports = Client;
