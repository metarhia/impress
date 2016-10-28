'use strict';

// PostgreSQL security provider for Impress Application Server
//
impress.security.pgsql = {};

// Mixin security to application instance
//
impress.security.pgsql.mixin = function(application) {
  application.security.hasDbWarned = false;

  // Is application has security DB configured
  //
  application.security.hasDb = function() {
    var result = api.common.getByPath(application, 'databases.security');
    if (!result && !application.security.hasDbWarned) {
      application.log.warning('No security database configured or can not connect to db');
      application.security.hasDbWarned = true;
    }
    return result;
  };

  // Create collections and indexes for security subsystem in PostgreSQL
  //
  application.security.createDataStructures = function(callback) {
    console.log('Impress'.green.bold + ' installing initial data structures to PostgreSQL...'.green);
    if (!api.db.pgsql) application.log.warning('No PostgreSQL drivers found');
    else {
      var securitySchema = api.definition.require('impress.security.schema');
      if (!securitySchema) {
        application.log.warning('No Impress security database schema for PostgreSQL loaded');
        if (callback) callback();
      } else {
        application.databases.security.generateSchema(securitySchema, function() {
          console.log('  Data changed. Bye!'.green);
          if (callback) callback();
        });
      }
    }
  };

  application.security.dropDataStructures = function(callback) {
    // Not implemented
    if (callback) callback();
  };

  application.security.emptyDataStructures = function(callback) {
    // Not implemented
    if (callback) callback();
  };

  // Register user, return true/false
  //   http post should contain 'Email' and 'Password' fields
  //   callback(err, user)
  //
  // client.fields.Password
  // client.fields.Email
  //
  application.security.signUp = function(client, email, password, callback) {
    application.security.getUser(client, email, function(err, user) {
      if(!user) {
        if (application.security.hasDb()) {
          if (!password) password = impress.security.generateKey();
          var q = 'INSERT INTO "users" ("login", "password", "group") VALUES ($1, $2, $3)';

          application.databases.security.connection.query(q, [email, password, 'users'], function(err, data) {
            if(err || !data.rowCount) throw callback(false);
            else application.security.getUser(client, email, function(err, user) {
              if(err || !user) return callback(false);

              user = new application.security.User(user);
              client.startSession();
              client.session.login = user.login;
              client.sessionModified = true;
              client.logged = true;
              application.users[user.login] = user;

              callback(null, user);
            });
          })
        } else callback(false);
      } else callback(new Error('Email already registered'), user);
    });
  };

  // Get user record from database
  //   callback(user)
  //
  application.security.getUser = function(client, login, callback) {
    if (application.security.hasDb()) {
      application.databases.security.connection.query('SELECT * FROM "users" WHERE login=$1 LIMIT 1', [login], function(err, node) {
        var user = node.rows[0];
        if (user) callback(err, new application.security.User(user));
        else callback(err, null);
      });
    } else callback();
  };

  // Restore session from database if available
  //   callback(err, session)
  //
  application.security.restorePersistentSession = function(client, sid, callback) {
    if (application.security.hasDb()) {
      application.databases.security.connection.query('SELECT * FROM "sessions" WHERE sid = $1 LIMIT 1', [sid], function(err, data) {
        var session = data.rows[0];

        if (session) {
          var login = session.login;
          delete session._id;
          session = new application.security.Session(session);
          application.sessions[sid] = session;
          if (login) {
            if (application.users[login]) {
              application.users[login].sessions.push(sid);
              callback(null, session);
            } else {
              application.security.getUser(client, login, function(err, node) {
                if (node) {
                  var user = new application.security.User(node);
                  user.sessions.push(sid);
                  application.users[login] = user;
                } else {
                  delete application.sessions[sid].login;
                  client.sessionModified = true;
                }
                callback(null, session);
              });
            }
          } else callback(null, session);
        } else callback(new Error('Session not found'));
      });
    } else callback(new Error('No database for security subsystem found'));
  };

  // Save session to database
  //
  application.security.savePersistentSession = function(client, sid, callback) {
    if (application.security.hasDb() && client.session) {
      var fields = Object.keys(client.session).filter(function(name) { return ['login', 'sid', 'group'].indexOf(name) > -1 });
      var fieldsEscaped = fields.map(function(str) { return '"' + str + '"' });
      var values = fields.map(function(name) { return client.session[name] }).map(function(name) { return (typeof name == 'string') ? name : JSON.stringify(name) });
      var items = values.map(function(n, i) { return '$' + (i + 1) });
      var conn = application.databases.security.connection;

      client.session.sid = sid;
      if (client.sessionCreated) {
        conn.query('INSERT INTO "sessions" (' + fieldsEscaped.join(', ') + ') VALUES (' + items.join(', ') + ')', values, function(err) {
          client.sessionCreated = false;
          client.sessionModified = false;
          callback();
        });
      } else if (client.sessionModified) {
        conn.query('UPDATE "sessions" SET ' + fieldsEscaped.map(function(str, i) { return str + " = '" + items[i] + "'" }), items, function(/*err*/) {
          client.sessionCreated = false;
          client.sessionModified = false;
          callback()
        });
      } else callback();
    } else callback();
  };
  //
  // // Delete session from database
  // //
  application.security.deletePersistentSession = function(client, sid, callback) {
    if (application.security.hasDb()) {
      application.databases.security.connection.query('DELETE FROM "sessions" WHERE sid = $1', [sid], callback)
    } else callback();
  };
};
