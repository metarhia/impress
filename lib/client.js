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
    this.ip = req.socket.remoteAddress;
    this.connection = connection;
  }

  static() {
    const { req: { url, method }, res, ip } = this;
    const filePath = url === '/' ? '/index.html' : url;
    const fileExt = path.extname(filePath).substring(1);
    const mimeType = MIME_TYPES[fileExt] || MIME_TYPES.html;
    res.writeHead(200, { ...HEADERS, 'Content-Type': mimeType });
    if (res.writableEnded) return;
    const data = application.static.get(filePath);
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
    res.writeHead(302, { 'Location': location });
    res.end();
  }

  error(code, err, callId = err) {
    const { req: { url, method }, res, connection, ip } = this;
    const status = http.STATUS_CODES[code];
    if (typeof err === 'number') err = undefined;
    const reason = err ? err.stack : status;
    application.logger.error(`${ip}\t${method}\t${url}\t${code}\t${reason}`);
    if (connection) {
      const packet = { callback: callId, error: { code, message: status } };
      connection.send(JSON.stringify(packet));
      return;
    }
    if (res.writableEnded) return;
    res.writeHead(status, { 'Content-Type': MIME_TYPES.json });
    const packet = { code, error: status };
    res.end(JSON.stringify(packet));
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
    const { res, connection, ip } = this;
    const { semaphore } = application.server;
    try {
      await semaphore.enter();
    } catch {
      this.error(504, callId);
      return;
    }
    const [iname, ver = '*'] = interfaceName.split('.');
    try {
      let session = await application.auth.restore(this);
      const proc = application.runMethod(iname, ver, methodName, session);
      if (!proc) {
        this.error(404, callId);
        return;
      }
      if (!session && proc.access !== 'public') {
        this.error(403, callId);
        return;
      }
      const result = await proc.method(args);
      const userId = result ? result.userId : undefined;
      if (!session && userId && proc.access === 'public') {
        session = application.auth.start(this, userId);
        result.token = session.token;
      }
      const data = JSON.stringify({ callback: callId, result });
      if (connection) connection.send(data);
      else res.end(data);
      const token = session ? session.token : 'anonymous';
      const record = `${ip}\t${token}\t${interfaceName}/${methodName}`;
      application.logger.access(record);
    } catch (err) {
      this.error(500, err, callId);
    } finally {
      semaphore.leave();
    }
  }
}

module.exports = Client;
