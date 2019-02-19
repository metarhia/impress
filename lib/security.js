'use strict';

// Security subsystem of Impress Application Server

// Calculate password hash
//   password <string>
//   callback <Function>
//     err <Error>
//     hash <string>
const getHash = (password, callback) => api.argon2
  .hash(password, { type: api.argon2.argon2id })
  .then(hash => {
    callback(null, hash);
  }, error => {
    callback(error);
  });

// Verify password
//   hash <string>
//   password <string>
//   callback <Function>
//     err <Error> null on success
const verifyHash = (hash, password, callback) => api.argon2
  .verify(hash, password)
  .then(matches => {
    if (!matches) {
      callback(new Error('Authentication error'));
      return;
    }
    callback(null);
  }, callback);

class Session {

  constructor(token, login, group, data) {
    this.Category = 'Session';
    this.Token = token;
    this.Login = login;
    this.Group = group;
    this.Data = data;
  }

}

class Security {

  constructor(application) {
    this.application = application;
    this.singleWarning = true;
    this.hasDbWarned = false;
    this.gs = null;

    // Mixin security database provider when the databases are ready
    application.on('databasesOpened', () => {
      if (!application.databases) return;
      for (const dbName in application.databases) {
        const database = application.databases[dbName];
        if (database.security) {
          application.databases.security = database.connection;
          this.gs = database.connection;
        }
      }
    });
  }

  showWarning() {
    if (this.singleWarning) {
      this.application.log.warn('Security provider can\'t be loaded');
      this.singleWarning = false;
    }
  }

  hasDb() {
    if (this.hasDbWarned) return false;
    const result = this.application.databases.security;
    if (!result || !result.active) {
      this.application.log.warn('Can not connect to security database');
      this.hasDbWarned = true;
      return false;
    }
    return true;
  }

  // Sign in
  //   client <Client>
  //   login <string>
  //   password <string>
  //   callback <Function>
  //     err <Error> null on success
  signIn(client, login, password, callback) {
    this.getUser(login, (err, user) => {
      if (!user) {
        callback(new Error('Authentication error'));
        return;
      }
      verifyHash(user.Password, password, err => {
        if (err) {
          callback(err);
        } else {
          this.startSession();
          client.session.Login = user.Login;
          client.session.Group = user.Group;
          client.sessionModified = true;
          client.logged = true;
          callback(null);
        }
      });
    });
  }

  // Register user
  //   login <string>
  //   password <string>
  //   callback <Function>
  //     err <Error> null on success
  signUp(client, login, password, callback) {
    getHash(password, (error, hash) => {
      if (error) {
        callback(error);
        return;
      }
      this.getUser(login, (err, user) => {
        if (user) {
          callback(new Error('Login already registered'), user);
          return;
        }
        const record = {
          Category: 'Users', Login: login, Password: hash, Group: 'users'
        };
        // TODO: to be refactored and integrated with gs
        this.gs.create(record, err => {
          if (!err) {
            this.application.startSession(client);
            client.session.Login = login;
            client.sessionModified = true;
            client.logged = true;
          }
          callback(err);
        });
      });
    });
  }

  // Sign out
  //   callback <Function>
  //     err <Error> null on success
  signOut(client, callback) {
    const session = client.session;
    if (!session) {
      callback(null);
      return;
    }
    session.Login = undefined;
    session.Group = undefined;
    client.sessionModified = true;
    client.logged = false;
    callback(null);
  }

  // Get user record from database
  //   login <string>
  //   callback <Function> (user)
  getUser(login, callback) {
    // TODO: to be refactored and integrated with gs
    if (!this.hasDb()) {
      callback(new Error('No security database'));
      return;
    }
    this.gs
      .select({ Category: 'Users', Login: login })
      .one()
      .fetch(callback);
  }

  startSession(client) {
    if (!client.session) {
      const config = this.application.config.sections.sessions;
      const { secret, characters, length, domain, cookie } = config;
      const token = api.common.generateToken(secret, characters, length);
      client.session = new Session(token);
      client.sessionModified = true;
      client.sessionCreated = true;
      client.setCookie(cookie, token, domain);
      const cookieName = impress.config.sections.scale.cookie;
      if (cookieName) client.setCookie(cookieName, impress.nodeId);
      this.application.sessions.set(token, client.session);
    }
  }

  // Create session in database
  //   session <Object>
  //   callback <Function>
  //     err <Error>
  createSession(session, callback) {
    // TODO: to be refactored and integrated with gs
    if (!this.hasDb()) {
      callback(null);
      return;
    }
    this.gs.create(session, err => {
      if (err) {
        this.application.logException(err);
        callback(new Error('Can not create session'));
      } else {
        callback(null);
      }
    });
  }

  // Update session in database
  //   session <Object>
  //   callback <Function>
  updateSession(session, callback) {
    // TODO: to be refactored and integrated with gs
    if (!this.hasDb()) {
      callback();
      return;
    }
    this.gs.update(session, callback);
  }

  saveSession(client, callback) {
    const done = () => {
      client.sessionCreated = false;
      client.sessionModified = false;
      callback();
    };

    const config = this.application.config.sections.sessions;
    if (config && config.persist && client.session) {
      if (client.sessionCreated) {
        this.createSession(client.session, done);
        return;
      }
      if (client.sessionModified) {
        this.updateSession(client.session, done);
        return;
      }
    }
    callback();
  }

  // Restore session from database if available
  //   token <number> session token
  //   callback <Function> (err, session)
  readSession(token, callback) {
    // TODO: to be refactored and integrated with gs
    if (!this.hasDb()) {
      callback(new Error('No database for security subsystem found'));
      return;
    }
    this.gs
      .select({ category: 'Session', Token: token })
      .one()
      .fetch((err, session) => {
        if (err) {
          callback(new Error('Session not found'));
          return;
        }
        this.application.sessions.set(token, session);
        callback(null, session);
      });
  }

  // Restore session
  //   client <Client>
  //   callback <Function>
  //     err <Error>
  //     session <Session>
  restoreSession(client, callback) {
    // TODO: to be refactored and integrated with gs
    const application = this.application;

    const config = application.config.sections.sessions;
    const token = client.cookies[config.cookie];

    if (!token) {
      callback(new Error('No token'));
      return;
    }

    const session = application.sessions.get(token);
    if (session) {
      client.session = session;
      client.logged = !!session.login;
      application.emit('clientSession', this);
      callback(null, session);
      return;
    }

    const valid = api.common.validateToken(config.secret, token);
    if (!valid) {
      client.deleteCookie(config.cookie);
      callback(new Error('Session is not valid'));
      return;
    }

    if (!config.persist) {
      callback(new Error('Session is not persistent'));
      return;
    }

    this.readSession(token, (err, session) => {
      if (err) {
        client.deleteCookie(config.cookie);
        callback(new Error('Session is not found'));
        return;
      }
      const { login, data } = session;
      client.session = new Session(token, login, undefined, data);
      client.logged = !!login;
      application.emit('clientSession', client);
      application.sessions.set(token, session);
      callback(null, session);
    });
  }

  destroySession(client) {
    const session = client.session;
    if (session) {
      const application = this.application;
      const config = application.config.sections.sessions;
      const cookieName = impress.config.sections.scale.cookie;
      client.deleteCookie(config.cookie, config.domain);
      client.deleteCookie(cookieName, config.domain);
      application.sessions.delete(session.token);
      this.deleteSession(session.token);
      client.session = null;
    }
  }

  // Delete session from database
  //   token <string> session token
  //   callback <Function> (err, session)
  deleteSession(token, callback) {
    // TODO: to be refactored and integrated with gs
    if (!this.hasDb()) {
      callback(null);
      return;
    }
    this.gs.delete({ Category: 'Sessions', Token: token }, true, callback);
  }

}

impress.Security = Security;
