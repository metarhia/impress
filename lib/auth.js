'use strict';

const metautil = require('metautil');

const accounts = new Map();
const sessions = new Map();

module.exports = ({ characters, secret, length }) => ({
  generateToken() {
    return metautil.generateToken(secret, characters, length);
  },

  async saveSession(token, data) {
    sessions.get(token).data = data;
  },

  async createSession(token, data, fields = {}) {
    sessions.set(token, { token, data, ...fields });
  },

  async readSession(token) {
    return sessions.get(token) || null;
  },

  async deleteSession(token) {
    sessions.delete(token);
  },

  async registerUser(login, password) {
    accounts.set(login, { login, password });
  },

  async getUser(login) {
    return accounts.get(login);
  },
});
