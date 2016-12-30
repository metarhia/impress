'use strict';

const AUTH_ERROR = 'Authentication error';

// Security plugin for Impress Application Server

// Mixin security to application instance
//
impress.security.mixin = (application) => {

  let singleWarning = true;

  // Print warning to stdout
  //
  function showWarning() {
    if (singleWarning) {
      application.log.warning('Security provider can`t be loaded');
      singleWarning = false;
    }
  }

  // User factory
  //   user.id - user id in storage provider
  //   user.login - unique login
  //   user.password - password hash
  //   user.group - group name
  //   user.access - last access time
  //   user.data - stored data
  //   user.sessions - array of session instance (not stored)
  //   user.ips - array of ip in integer form (not stored)
  //   user.sse - SSE sockets to send events (not stored)
  //   user.jstp - JSTP connections (not stored)
  //
  application.security.user = (user) => {
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

  // Is application has security DB configured
  //
  application.security.hasDb = () => {
    const result = api.common.getByPath(application, 'databases.security');
    if (!result && !hasDbWarned) {
      application.log.warning('Can not connect to security database');
      hasDbWarned = true;
    }
    return result;
  };

  // Session data structure
  //   session.id - storage id
  //   session.category - by default 'Session'
  //   session.login - user login
  //   session.sid - session id
  //   session.data - session stored data
  //
  application.security.session = (session) => {
    if (!session.sid) session.sid = api.common.generateSID(application.config);
    if (!session.data) session.data = {};
    return session;
  };

  // Get user for given session or {}
  //
  application.security.getSessionUser = (sid) => {
    const login = application.sessions[sid].login;
    if (login) return application.users[login];
    else return null;
  };

  // Calculate password hash
  //   password - input value
  //   callback(err, hash) - result
  //
  application.security.hash = (password, callback) => {
    const saltRounds = application.config.saltRounds || 10;
    api.bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) callback(err);
      else api.bcrypt.hash(password, salt, callback);
    });
  };

  // User SignIn
  //   login
  //   password
  //   callback(err, user)
  //
  application.security.signIn = (login, password, callback) => {
    application.security.getUser(login, (err, user) => {
      if (user) {
        api.bcrypt.compare(password, user.password, (err, isMatch) => {
          if (!err && isMatch) callback(null, user);
          else callback(new Error(AUTH_ERROR));
        });
      } else callback(new Error(AUTH_ERROR));
    });
  };

  // Create collections and indexes for security subsystem
  //
  application.security.createDataStructures = (callback) => {
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

  // Register user
  //   login
  //   password
  //   callback(err, user)
  //
  application.security.signUp = (login, password, callback) => {
    application.security.hash(password, (err, passwordHash) => {
      application.security.getUser(login, (err, user) => {
        if (!user) {
          const record = {
            category: 'Users',
            login,
            password: passwordHash,
            group: 'users'
          };
          application.databases.security.create(record, (err) => {
            let user;
            if (!err) {
              user = application.security.user(record);
            }
            callback(err, user);
          });
        } else {
          callback(new Error('Login already registered'), user);
        }
      });
    });
  };

  // Get user record from database
  //   callback(user)
  //
  application.security.getUser = (login, callback) => {
    if (application.security.hasDb()) {
      application.databases.security
        .select({ category: 'Users', login })
        .one()
        .fetch((err, user) => {
          if (user) callback(null, application.security.user(user));
          else callback(err);
        });
    } else callback(new Error('No security database'));
  };

  // Create session in database
  //
  application.security.createSession = (session, callback) => {
    if (application.security.hasDb()) {
      session.category = 'Sessions';
      application.databases.security.create(session, callback);
    } else callback();
  };

  // Update session in database
  //
  application.security.updateSession = (session, callback) => {
    if (application.security.hasDb()) {
      session.category = 'Sessions';
      application.databases.security.update(session, callback);
    } else callback();
  };

  // Restore session from database if available
  //   callback(err, session)
  //
  application.security.readSession = (sid, callback) => {
    if (application.security.hasDb()) {
      application.databases.security
        .select({ category: 'Sessions', sid })
        .one()
        .fetch((err, session) => {
          if (err) callback(new Error('Session not found'));
          else {
            const login = session.login;
            delete session._id;
            session = application.security.session(session);
            application.sessions[sid] = session;
            if (login) {
              if (application.users[login]) {
                application.users[login].sessions.push(sid);
                callback(null, session);
              } else {
                application.security.getUser(login, (err, item) => {
                  if (item) {
                    const user = application.security.user(item);
                    user.sessions.push(sid);
                    application.users[login] = user;
                  } else {
                    delete application.sessions[sid].login;
                  }
                  callback(null, session);
                });
              }
            } else callback(null, session);
          }
        });
    } else callback(new Error('No database for security subsystem found'));
  };

  // Delete session from database
  //
  application.security.deleteSession = (sid, callback) => {
    if (application.security.hasDb()) {
      const gs = application.databases.security;
      gs.delete({ category: 'Sessions', sid }, true, callback);
    } else callback();
  };

  // Mixin security database provider when the databases are ready
  //
  application.on('databasesOpened', () => {
    if (application.databases) {
      for (const dbName in application.databases) {
        const database = application.databases[dbName];
        if (database.security) {
          application.databases.security = database.connection;
        }
      }
    }
  });

};
