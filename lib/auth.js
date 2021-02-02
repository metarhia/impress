'use strict';

const { metarhia } = require('./dependencies.js');
const { metautil } = metarhia;

let auth = null;
const sessions = new Map();

const contextHandler = (session) => ({
  get: (data, key) => {
    if (key === 'token') return session.token;
    if (key === 'client') return session.channel.client;
    return Reflect.get(data, key);
  },
  set: (data, key, value) => {
    const res = Reflect.set(data, key, value);
    auth.saveSession(session);
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
    auth = this;
  }

  init(database) {
    this.db = database;
  }

  generateToken() {
    const { characters, secret, length } = this;
    return metautil.generateToken(secret, characters, length);
  }

  saveSession(session) {
    const data = JSON.stringify(session.data);
    this.db.update('Session', { data }, { token: session.token });
  }

  starSession(channel, userId) {
    const token = this.generateToken();
    const session = new Session(token, channel, {}, contextHandler);
    sessions.set(token, session);
    const data = JSON.stringify(session.data);
    this.db.insert('Session', { userId, token, ip: channel.ip, data });
    return session;
  }

  async restoreSession(channel, token) {
    let session = sessions.get(token);
    if (!session) {
      const [record] = await this.db.select('Session', ['Data'], { token });
      if (record && record.data) {
        const data = JSON.parse(record.data);
        session = new Session(token, channel, data, contextHandler);
        sessions.set(token, session);
      }
    }
    if (!session) return null;
    return session;
  }

  deleteSession(token) {
    sessions.delete(token);
    this.db.delete('Session', { token });
  }

  registerUser(login, password, fullName) {
    this.db.insert('SystemUser', { login, password, fullName }).then((data) => {
      console.log('registerUser', { login, password, fullName, data });
    });
  }

  getUser(login) {
    return this.db
      .select('SystemUser', ['Id', 'Password'], { login })
      .then(([user]) => user);
  }
}

module.exports = { Auth };
