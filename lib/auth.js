'use strict';

const { npm: { common } } = require('./dependencies.js');
const application = require('./application.js');

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

module.exports = () => {
  const { db } = application;

  const contextHandler = session => ({
    get: (data, key) => {
      if (key === 'token') return session.token;
      return Reflect.get(data, key);
    },
    set: (data, key, value) => {
      const res = Reflect.set(data, key, value);
      session.save(session.token, data);
      return res;
    }
  });

  class Session {
    constructor(token, channel, data) {
      this.token = token;
      this.channel = channel;
      this.channels = new Map([channel]);
      this.data = data;
      this.context = new Proxy(data, contextHandler(this));
    }

    save() {
      const data = JSON.stringify(this.data);
      db.update('Session', { data }, { token: this.token });
    }
  }

  const start = (channel, userId) => {
    const { characters, secret, length } = application.config.sessions;
    const token = common.generateToken(secret, characters, length);
    const host = common.parseHost(channel.req.headers.host);
    const ip = channel.req.connection.remoteAddress;
    const cookie = `${TOKEN}=${token}; ${COOKIE_HOST}=${host}`;
    const session = new Session(token, channel, {});
    sessions.set(token, session);
    cache.set(channel.req, session);
    const data = JSON.stringify(session.data);
    db.insert('Session', { userId, token, ip, data });
    if (channel.res) channel.res.setHeader('Set-Cookie', cookie);
    return session;
  };

  const restore = async channel => {
    const cachedSession = cache.get(channel.req);
    if (cachedSession) return cachedSession;
    const { cookie } = channel.req.headers;
    if (!cookie) return null;
    const cookies = parseCookies(cookie);
    const { token } = cookies;
    if (!token) return null;
    let session = sessions.get(token);
    if (!session) {
      const [record] = await db.select('Session', ['Data'], { token });
      if (record && record.data) {
        const data = JSON.parse(record.data);
        session = new Session(token, channel, data);
        sessions.set(token, session);
      }
    }
    if (!session) return null;
    cache.set(channel.req, session);
    return session;
  };

  const remove = (channel, token) => {
    const host = common.parseHost(channel.req.headers.host);
    channel.res.setHeader('Set-Cookie', COOKIE_DELETE + host);
    sessions.delete(token);
    db.delete('Session', { token });
  };

  const registerUser = (login, password, fullName) => {
    db.insert('SystemUser', { login, password, fullName });
  };

  const getUser = login => db
    .select('SystemUser', ['Id', 'Password'], { login })
    .then(([user]) => user);

  return Object.freeze({ start, restore, remove, registerUser, getUser });
};
