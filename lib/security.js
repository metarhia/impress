'use strict';

// Security plugin for Impress Application Server

const AUTH_ERROR = 'Authentication error';

const mixin = (application) => {

  const security = application.security;
  let singleWarning = true;

  const showWarning = () => {
    if (singleWarning) {
      impress.log.warn('Security provider can\'t be loaded');
      singleWarning = false;
    }
  };

  security.user = (
    // User factory
    user // user instance, fields:
    // id - user id in storage provider
    // login - unique login
    // password - password hash
    // group - group name
    // access - last access time
    // data - stored data
    // sessions - array of session instance (not stored)
    // ips - array of ip in integer form (not stored)
    // sse - SSE sockets to send events (not stored)
    // jstp - JSTP connections (not stored)
  ) => {
    //if (!user) user = {};
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

  security.session = (
    session // session instance, fields:
    // id - storage id
    // category - by default 'Session'
    // login - user login
    // sid - session id
    // data - session stored data
  ) => {
    if (!session.sid) {
      session.sid = api.common.generateSID(application.config.sessions);
    }
    session.data = session.data || {};
    return session;
  };

  security.getSessionUser = (sid) => {
    const session = application.sessions.get(sid);
    if (!session || !session.login) return null;
    return application.users.get(session.login);
  };

  security.hash = (
    // Calculate password hash
    password, // string
    callback // function(err, hash)
  ) => {
    api.argon2.hash(
      password,
      { type: api.argon2.argon2id }
    ).then((hash, error) => {
      callback(error, hash);
    });
  };

  security.signIn = (
    login, // string
    password, // string
    callback // function(err, user)
  ) => {
    security.getUser(login, (err, user) => {
      if (!user) {
        callback(new Error(AUTH_ERROR));
        return;
      }

      api.argon2.verify(user.password, password).then((matches, error) => {
        if (error) {
          callback(error);
        } else if (!matches) {
          callback(new Error(AUTH_ERROR));
        } else {
          callback(null, user);
        }
      });
    });
  };

  security.createDataStructures = (
    callback // Create collections and indexes for security subsystem
  ) => {
    const securitySchema = api.definition.require('impress.security.schema');
    application.databases.security.generateSchema(securitySchema, () => {
      impress.log.info('Data changed. Bye!');
      if (callback) callback();
    });
  };

  security.dropDataStructures = (callback) => {
    showWarning();
    if (callback) callback();
  };

  security.emptyDataStructures = (callback) => {
    showWarning();
    if (callback) callback();
  };

  security.signUp = (
    // Register user
    login, // string
    password, // string
    callback // function(err, user)
  ) => {
    security.hash(password, (hash, error) => {
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

  security.getUser = (
    // Get user record from database
    login, // string
    callback // function(user)
  ) => {
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

  security.createSession = (
    // Create session in database
    session, // session instance
    callback // function
  ) => {
    if (!security.hasDb()) {
      callback();
      return;
    }
    session.category = 'Sessions';
    application.databases.security.create(session, callback);
  };

  security.updateSession = (
    // Update session in database
    session, // session instance
    callback // function
  ) => {
    if (!security.hasDb()) {
      callback();
      return;
    }
    session.category = 'Sessions';
    application.databases.security.update(session, callback);
  };

  security.readSession = (
    // Restore session from database if available
    sid, // session id
    callback // function(err, session)
  ) => {
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

  security.deleteSession = (
    // Delete session from database
    sid, // session id
    callback // function(err, session)
  ) => {
    const cb = api.common.once(callback);
    if (!security.hasDb()) {
      cb();
      return;
    }
    const gs = application.databases.security;
    gs.delete({ category: 'Sessions', sid }, true, cb);
  };

  application.on('databasesOpened', (
    // Mixin security database provider when the databases are ready
  ) => {
    if (!application.databases) return;
    let dbName, database;
    for (dbName in application.databases) {
      database = application.databases[dbName];
      if (database.security) {
        application.databases.security = database.connection;
      }
    }
  });

};

module.exports = {
  mixinApplication: mixin
};
