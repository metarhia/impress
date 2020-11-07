'use strict';

const { metarhia } = require('./dependencies.js');
const { common } = metarhia;

const TOKEN = 'token';
const EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT';
const FUTURE = 'Fri, 01 Jan 2100 00:00:00 GMT';
const LOCATION = 'Path=/; Domain';
const COOKIE_DELETE = `${TOKEN}=deleted; Expires=${EPOCH}; ${LOCATION}=`;
const COOKIE_HOST = `Expires=${FUTURE}; ${LOCATION}`;

const sessions = new Map();
const cache = new WeakMap();

const parseCookies = cookie => {
  const values = {};
  const items = cookie.split(';');
  for (const item of items) {
    const parts = item.split('=');
    const key = parts[0].trim();
    const val = parts[1] || '';
    values[key] = val.trim();
  }
  return values;
};

const contextHandler = auth => session => ({
  get: (data, key) => {
    if (key === 'token') return session.token;
    if (key === 'client') return session.channel.client;
    return Reflect.get(data, key);
  },
  set: (data, key, value) => {
    const res = Reflect.set(data, key, value);
    auth.save(session);
    return res;
  },
});

class Session {
  constructor(token, channel, data, handler) {
    this.token = token;
    this.channel = channel;
    this.channels = new Map([channel]);
    this.data = data;
    this.context = new Proxy(data, handler(this));
  }
}

class Auth {
  constructor(options) {
    const { characters, secret, length } = options;
    this.characters = characters;
    this.secret = secret;
    this.length = length;
    this.db = null;
  }

  init(database) {
    this.db = database;
  }

  save(session) {
    const data = JSON.stringify(session.data);
    this.db.update('Session', { data }, { token: session.token });
  }

  start(channel, userId) {
    const { characters, secret, length } = this;
    const token = common.generateToken(secret, characters, length);
    const host = common.parseHost(channel.req.headers.host);
    const ip = channel.req.connection.remoteAddress;
    const cookie = `${TOKEN}=${token}; ${COOKIE_HOST}=${host}`;
    const session = new Session(token, channel, {}, contextHandler(this));
    sessions.set(token, session);
    cache.set(channel.req, session);
    const data = JSON.stringify(session.data);
    this.db.insert('Session', { userId, token, ip, data });
    if (channel.res) channel.res.setHeader('Set-Cookie', cookie);
    return session;
  }

  async restore(channel) {
    const cachedSession = cache.get(channel.req);
    if (cachedSession) return cachedSession;
    const { cookie } = channel.req.headers;
    if (!cookie) return null;
    const cookies = parseCookies(cookie);
    const { token } = cookies;
    if (!token) return null;
    let session = sessions.get(token);
    if (!session) {
      const [record] = await this.db.select('Session', ['Data'], { token });
      if (record && record.data) {
        const data = JSON.parse(record.data);
        session = new Session(token, channel, data, contextHandler(this));
        sessions.set(token, session);
      }
    }
    if (!session) return null;
    cache.set(channel.req, session);
    return session;
  }

  remove(channel, token) {
    const host = common.parseHost(channel.req.headers.host);
    channel.res.setHeader('Set-Cookie', COOKIE_DELETE + host);
    sessions.delete(token);
    this.db.delete('Session', { token });
  }

  registerUser(login, password, fullName) {
    this.db.insert('SystemUser', { login, password, fullName });
  }

  getUser(login) {
    return this.db
      .select('SystemUser', ['Id', 'Password'], { login })
      .then(([user]) => user);
  }
}

module.exports = { Auth };
