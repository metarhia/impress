'use strict';

// Security subsystem of Impress Application Server

class Session {
  constructor(token, login, group, data) {
    this.Category = 'Session';
    this.Token = token;
    this.Login = login;
    this.Group = group;
    this.Data = data;
  }
}

// Sign in
//   login <string>
//   password <string>
const signIn = async (login, password) => {
  try {
    const [user] = await api.gs.select('Users', { Login: login }).fetch();
    const hash = user.Hash;
    await api.argon2.verify(hash, password);
    return true;
  } catch (err) {
    throw new Error('Authentication error');
  }
};

// Register user
//   login <string>
//   password <string>
const signUp = async (login, password) => {
  try {
    const [user] = await api.gs.select('Users', { Login: login }).fetch();
    if (user) throw new Error('Login already registered');
    const hash = api.argon2.hash(password, { type: api.argon2.argon2id });
    const record = {
      Category: 'Users', Login: login, Password: hash, Group: 'users'
    };
    await api.gs.create(record);
  } catch (err) {
    throw new Error('Registration error');
  }
};

module.exports = { Session, signIn, signUp };
