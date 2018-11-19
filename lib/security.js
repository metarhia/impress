'use strict';

// Security plugin for Impress Application Server

const AUTH_ERROR = 'Authentication error';

const mixin = application => {

  const security = application.security;
  let singleWarning = true;

  const showWarning = () => {
    if (singleWarning) {
      impress.log.warn('Security provider can\'t be loaded');
      singleWarning = false;
    }
  };

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
  //     sse <Object> SSE sockets to send events (not stored)
  //     jstp <Object> JSTP connections (not stored)
  security.user = user => {
    if (!user.data) user.data = {};
    user.sessions = []; // array of sid, one user can have many sessions
    user.ips = []; // array of ip in integer form
    user.sse = {}; // SSE/EventStream sockets to send events
    user.jstp = {}; // JSTP connections
    user.access = Date.now(); // last access time
    return user;
  };

  let hasDbWarned = false;

  security.hasDb = () => {
    const result = api.common.getByPath(application, 'databases.security');
    if ((!result || !result.active) && !hasDbWarned) {
      impress.log.warn('Can not connect to security database');
      hasDbWarned = true;
      return;
    }
    return result;
  };

  // Init session
  //   session <Object> session instance, fields
  //     id <number> storage id
  //     category <string> by default 'Session'
  //     login <string> user login
  //     sid <string> session id
  //     data <Object> session stored data
  security.session = session => {
    if (!session.sid) {
      session.sid = api.common.generateSID(
        application.config.sections.sessions
      );
    }
    session.data = session.data || {};
    return session;
  };

  security.getSessionUser = sid => {
    const session = application.sessions.get(sid);
    if (!session || !session.login) return null;
    return application.users.get(session.login);
  };

  // Calculate password hash
  //   password <string>
  //   callback <Function> (err, hash)
  security.hash = (password, callback) => {
    api.argon2
      .hash(password, { type: api.argon2.argon2id })
      .then(hash => callback(null, hash))
      .catch(error => callback(error));
  };

  // SignIn
  //   login <string>
  //   password <string>
  //   callback <Function> (err, user)
  security.signIn = (login, password, callback) => {
    security.getUser(login, (err, user) => {
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
  };

  // Create collections and indexes for security subsystem
  //   callback <Function>
  security.createDataStructures = callback => {
    const securitySchema = api.definition.require('impress.security.schema');
    application.databases.security.generateSchema(securitySchema, () => {
      impress.log.info('Data changed. Bye!');
      if (callback) callback();
    });
  };

  security.dropDataStructures = callback => {
    showWarning();
    if (callback) callback();
  };

  security.emptyDataStructures = callback => {
    showWarning();
    if (callback) callback();
  };

  // Register user
  //   login <string>
  //   password <string>
  //   callback <Function> (err, user)
  security.signUp = (login, password, callback) => {
    security.hash(password, (error, hash) => {
      if (error) {
        callback(error);
        return;
      }
      security.getUser(login, (err, user) => {
        if (user) {
          callback(new Error('Login already registered'), user);
          return;
        }
        const record = {
          category: 'Users', login, password: hash, group: 'users'
        };
        application.databases.security.create(record, (err) => {
          let user;
          if (!err) user = security.user(record);
          callback(err, user);
        });
      });
    });
  };

  // Get user record from database
  //   login <string>
  //   callback <Function> (user)
  security.getUser = (login, callback) => {
    if (!security.hasDb()) {
      callback(new Error('No security database'));
      return;
    }
    application.databases.security
      .select({ category: 'Users', login })
      .one()
      .fetch((err, user) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, security.user(user));
      });
  };

  // Create session in database
  //   session <Object>
  //   callback <Function>
  security.createSession = (session, callback) => {
    if (!security.hasDb()) {
      callback();
      return;
    }
    session.category = 'Sessions';
    application.databases.security.create(session, callback);
  };

  // Update session in database
  //   session <Object>
  //   callback <Function>
  security.updateSession = (session, callback) => {
    if (!security.hasDb()) {
      callback();
      return;
    }
    session.category = 'Sessions';
    application.databases.security.update(session, callback);
  };

  // Restore session from database if available
  //   sid <number> session id
  //   callback <Function> (err, session)
  security.readSession = (sid, callback) => {
    if (!security.hasDb()) {
      callback(new Error('No database for security subsystem found'));
      return;
    }
    application.databases.security
      .select({ category: 'Sessions', sid })
      .one()
      .fetch((err, session) => {
        if (err) {
          callback(new Error('Session not found'));
          return;
        }
        const login = session.login;
        delete session._id;
        session = security.session(session);
        application.sessions.set(sid, session);
        if (!login) {
          callback(null, session);
          return;
        }
        const user = application.users.get(login);
        if (user) {
          user.sessions.push(sid);
          callback(null, session);
          return;
        }
        security.getUser(login, (err, item) => {
          if (item) {
            const user = security.user(item);
            user.sessions.push(sid);
            application.users.set(login, user);
          } else {
            application.sessions.delete(sid.login);
          }
          callback(null, session);
        });
      });
  };

  // Delete session from database
  //   sid <number> session id
  //   callback <Function> (err, session)
  security.deleteSession = (sid, callback) => {
    const cb = api.common.once(callback);
    if (!security.hasDb()) {
      cb();
      return;
    }
    const gs = application.databases.security;
    gs.delete({ category: 'Sessions', sid }, true, cb);
  };

  // Mixin security database provider when the databases are ready
  application.on('databasesOpened', () => {
    if (!application.databases) return;
    for (const dbName in application.databases) {
      const database = application.databases[dbName];
      if (database.security) {
        application.databases.security = database.connection;
      }
    }
  });

};

module.exports = {
  mixinApplication: mixin,
};
