'use strict';

// Security plugin for Impress Application Server

const AUTH_ERROR = 'Authentication error';

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
      impress.log.warn('Security provider can\'t be loaded');
      this.singleWarning = false;
    }
  }

  // User factory
  //   user <User>
  //     id <number> user id in storage provider
  //     login <string> unique login
  //     password <string> password hash
  //     group <group> group name
  //     access <number> last access time
  //     data <> stored data
  //     sessions <Array> of session instance (not stored)
  //     ips <Array> of ip in integer form (not stored)
  //     jstp <Object> JSTP connections (not stored)
  user(user) {
    if (!user.data) user.data = {};
    user.sessions = []; // array of sid, one user can have many sessions
    user.ips = []; // array of ip in integer form
    user.jstp = {}; // JSTP connections
    user.access = Date.now(); // last access time
    return user;
  }

  hasDb() {
    if (this.hasDbWarned) return false;
    const result = this.application.databases.security;
    if (!result || !result.active) {
      impress.log.warn('Can not connect to security database');
      this.hasDbWarned = true;
      return false;
    }
    return true;
  }

  // Init session
  //   session <Object> session instance, fields
  //     id <number> storage id
  //     category <string> by default 'Session'
  //     login <string> user login
  //     sid <string> session id
  //     data <Object> session stored data
  session(session) {
    if (!session.sid) {
      session.sid = api.common.generateSID(
        this.application.config.sections.sessions
      );
    }
    session.data = session.data || {};
    return session;
  }

  getSessionUser(sid) {
    const session = this.application.sessions.get(sid);
    if (!session || !session.login) return null;
    return this.application.users.get(session.login);
  }

  // Calculate password hash
  //   password <string>
  //   callback <Function> (err, hash)
  hash(password, callback) {
    api.argon2
      .hash(password, { type: api.argon2.argon2id })
      .then(hash => callback(null, hash))
      .catch(error => callback(error));
  }

  // SignIn
  //   login <string>
  //   password <string>
  //   callback <Function> (err, user)
  signIn(login, password, callback) {
    this.getUser(login, (err, user) => {
      if (!user) {
        callback(new Error(AUTH_ERROR));
        return;
      }

      api.argon2
        .verify(user.password, password)
        .then(matches => {
          if (!matches) {
            callback(new Error(AUTH_ERROR));
            return;
          }
          callback(null, user);
        })
        .catch(error => callback(error));
    });
  }

  // Create collections and indexes for security subsystem
  //   callback <Function>
  createDataStructures(callback) {
    const securitySchema = api.definition.require('impress.security.schema');
    this.gs.generateSchema(securitySchema, () => {
      impress.log.info('Data changed. Bye!');
      if (callback) callback();
    });
  }

  dropDataStructures(callback) {
    this.showWarning();
    if (callback) callback();
  }

  emptyDataStructures(callback) {
    this.showWarning();
    if (callback) callback();
  }

  // Register user
  //   login <string>
  //   password <string>
  //   callback <Function> (err, user)
  signUp(login, password, callback) {
    this.hash(password, (error, hash) => {
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
          category: 'Users', login, password: hash, group: 'users'
        };
        this.gs.create(record, err => {
          let user;
          if (!err) user = this.user(record);
          callback(err, user);
        });
      });
    });
  }

  // Get user record from database
  //   login <string>
  //   callback <Function> (user)
  getUser(login, callback) {
    if (!this.hasDb()) {
      callback(new Error('No security database'));
      return;
    }
    this.gs
      .select({ category: 'Users', login })
      .one()
      .fetch((err, user) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, this.user(user));
      });
  }

  // Create session in database
  //   session <Object>
  //   callback <Function>
  createSession(session, callback) {
    if (!this.hasDb()) {
      callback();
      return;
    }
    session.category = 'Sessions';
    this.gs.create(session, callback);
  }

  // Update session in database
  //   session <Object>
  //   callback <Function>
  updateSession(session, callback) {
    if (!this.hasDb()) {
      callback();
      return;
    }
    session.category = 'Sessions';
    this.gs.update(session, callback);
  }

  // Restore session from database if available
  //   sid <number> session id
  //   callback <Function> (err, session)
  readSession(sid, callback) {
    if (!this.hasDb()) {
      callback(new Error('No database for security subsystem found'));
      return;
    }
    this.gs
      .select({ category: 'Sessions', sid })
      .one()
      .fetch((err, session) => {
        if (err) {
          callback(new Error('Session not found'));
          return;
        }
        const login = session.login;
        delete session._id;
        session = this.session(session);
        this.application.sessions.set(sid, session);
        if (!login) {
          callback(null, session);
          return;
        }
        const user = this.application.users.get(login);
        if (user) {
          user.sessions.push(sid);
          callback(null, session);
          return;
        }
        this.getUser(login, (err, item) => {
          if (item) {
            const user = this.user(item);
            user.sessions.push(sid);
            this.application.users.set(login, user);
          } else {
            this.application.sessions.delete(sid.login);
          }
          callback(null, session);
        });
      });
  }

  // Delete session from database
  //   sid <number> session id
  //   callback <Function> (err, session)
  deleteSession(sid, callback) {
    const cb = api.common.once(callback);
    if (!this.hasDb()) {
      cb();
      return;
    }
    this.gs.delete({ category: 'Sessions', sid }, true, cb);
  }

}

impress.Security = Security;
