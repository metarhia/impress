'use strict';

const { metarhia } = require('./dependencies.js');
const { metautil } = metarhia;

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

  generateToken() {
    const { characters, secret, length } = this;
    return metautil.generateToken(secret, characters, length);
  }

  saveSession(token, data) {
    this.db.update('SystemSession', { data: JSON.stringify(data) }, { token });
  }

  startSession(token, data, fields = {}) {
    const record = { token, data: JSON.stringify(data), ...fields };
    this.db.insert('SystemSession', record);
  }

  async restoreSession(token) {
    const [record] = await this.db.select('SystemSession', ['data'], { token });
    if (record && record.data) return record.data;
    return null;
  }

  deleteSession(token) {
    this.db.delete('Session', { token });
  }

  async registerUser(login, password, fullName) {
    const record = { login, password, fullName };
    const data = await this.db.insert('SystemUser', record);
    return data;
  }

  async getUser(login) {
    const [user] = await this.db.select('SystemUser', ['*'], { login });
    return user;
  }
}

module.exports = { Auth };
