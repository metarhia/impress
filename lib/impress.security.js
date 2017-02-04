'use strict';

const AUTH_ERROR = 'Authentication error';

// Security plugin for Impress Application Server

// Mixin security to application instance

impress.security.mixin = (application) => {

  let singleWarning = true;

  function showWarning() {
    if (singleWarning) {
      application.log.warning('Security provider can\'t be loaded');
      singleWarning = false;
    }
  }

  //
  application.security.user = (
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

  application.security.hasDb = () => {
    const result = api.common.getByPath(application, 'databases.security');
    if (!result && !hasDbWarned) {
      application.log.warning('Can not connect to security database');
      hasDbWarned = true;
    }
    return result;
  };

  application.security.session = (
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

  application.security.getSessionUser = (sid) => {
    const session = application.sessions.get(sid);
    if (!session || !session.login) return null;
    return application.users.get(session.login);
  };

  application.security.hash = (
    // Calculate password hash
    password, // string
    callback // function(err, hash)
  ) => {
    const saltRounds = application.config.saltRounds || 10;
    api.bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) return callback(err);
      api.bcrypt.hash(password, salt, callback);
    });
  };

  application.security.signIn = (
    login, // string
    password, // string
    callback // function(err, user)
  ) => {
    application.security.getUser(login, (err, user) => {
      if (!user) return callback(new Error(AUTH_ERROR));
      api.bcrypt.compare(password, user.password, (err, isMatch) => {
        if (!err && isMatch) callback(null, user);
        else callback(new Error(AUTH_ERROR));
      });
    });
  };

  application.security.createDataStructures = (
    callback // Create collections and indexes for security subsystem
  ) => {
    const securitySchema = api.definition.require('impress.security.schema');
    application.databases.security.generateSchema(securitySchema, () => {
      console.log('  Data changed. Bye!'.green);
      if (callback) callback();
    });
  };

  application.security.dropDataStructures = (callback) => {
    showWarning();
    if (callback) callback();
  };

  application.security.emptyDataStructures = (callback) => {
    showWarning();
    if (callback) callback();
  };

  application.security.signUp = (
    // Register user
    login, // string
    password, // string
    callback // function(err, user)
  ) => {
    application.security.hash(password, (err, passwordHash) => {
      application.security.getUser(login, (err, user) => {
        if (user) return callback(new Error('Login already registered'), user);
        const record = {
          category: 'Users',
          login,
          password: passwordHash,
          group: 'users'
        };
        application.databases.security.create(record, (err) => {
          let user;
          if (!err) user = application.security.user(record);
          callback(err, user);
        });
      });
    });
  };

  application.security.getUser = (
    // Get user record from database
    login, // string
    callback // function(user)
  ) => {
    if (!application.security.hasDb()) {
      return callback(new Error('No security database'));
    }
    application.databases.security
      .select({ category: 'Users', login })
      .one()
      .fetch((err, user) => {
        if (err) return callback(err);
        callback(null, application.security.user(user));
      });
  };

  application.security.createSession = (
    // Create session in database
    session, // session instance
    callback // function
  ) => {
    if (!application.security.hasDb()) return callback();
    session.category = 'Sessions';
    application.databases.security.create(session, callback);
  };

  application.security.updateSession = (
    // Update session in database
    session, // session instance
    callback // function
  ) => {
    if (!application.security.hasDb()) return callback();
    session.category = 'Sessions';
    application.databases.security.update(session, callback);
  };

  application.security.readSession = (
    // Restore session from database if available
    sid, // session id
    callback // function(err, session)
  ) => {
    if (!application.security.hasDb()) {
      return callback(new Error('No database for security subsystem found'));
    }
    application.databases.security
      .select({ category: 'Sessions', sid })
      .one()
      .fetch((err, session) => {
        if (err) {
          return callback(new Error('Session not found'));
        }
        const login = session.login;
        delete session._id;
        session = application.security.session(session);
        application.sessions.set(sid, session);
        if (!login) return callback(null, session);
        const user = application.users.get(login);
        if (user) {
          user.sessions.push(sid);
          callback(null, session);
        } else {
          application.security.getUser(login, (err, item) => {
            if (item) {
              const user = application.security.user(item);
              user.sessions.push(sid);
              application.users.set(login, user);
            } else {
              application.sessions.delete(sid.login);
            }
            callback(null, session);
          });
        }
      });
  };

  application.security.deleteSession = (
    // Delete session from database
    sid, // session id
    callback // function(err, session)
  ) => {
    if (!application.security.hasDb()) return callback();
    const gs = application.databases.security;
    gs.delete({ category: 'Sessions', sid }, true, callback);
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
