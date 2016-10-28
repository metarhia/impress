'use strict';

// MongoDB security provider for Impress Application Server
//
impress.security.mongodb = {};

// Mixin security to application instance
//
impress.security.mongodb.mixin = function(application) {

  application.security.hasDbWarned = false;

  // Is application has security DB configured
  //
  application.security.hasDb = function() {
    var result = api.common.getByPath(application, 'databases.security.sessions');
    if (!result && !application.security.hasDbWarned) {
      application.log.warning('No security database configured or can not connect to db');
      application.security.hasDbWarned = true;
    }
    return result;
  };

  // Create collections and indexes for security subsystem in MongoDB
  //
  application.security.createDataStructures = function(callback) {
    if (!api.db.mongodb) application.log.warning('No MongoDB drivers found');
    else {
      var securitySchema = api.definition.require('impress.security.schema');
      if (!securitySchema) {
        application.log.warning('No Impress security database schema for MongoDB loaded');
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
      if (!user) {
        if (application.security.hasDb()) {
          if (!password) password = impress.security.generateKey();
          var userInfo = {
            login: email,
            password: password,
            group: 'users'
          };
          application.databases.security.category('users').new(userInfo
          , function(err, objectId) {
              var user;
              if (!err) {
                user = new application.security.User(userInfo);
                user.id = objectId;
                client.startSession();
                client.session.login = user.login;
                client.sessionModified = true;
                client.logged = true;
                application.users[user.login] = user;
              }
              callback(null, !!user);
          });
        } else callback();
      } else {
        callback(new Error('Email already registered'), user);
      }
    });
  };

  // Get user record from database
  //   callback(user)
  //
  application.security.getUser = function(client, login, callback) {
    if (application.security.hasDb()) {
      application.databases.security.category('users')
                 .findOne({ login: login }
      , function(err, node) {
        if (node) callback(err, new application.security.User(node));
        else callback(err, null);
      });
    } else callback();
  };

  // Restore session from database if available
  //   callback(err, session)
  //
  application.security.restorePersistentSession = function(client, sid, callback) {
    if (application.security.hasDb()) {
      application.databases.security.sessions.findOne({ sid: sid }, function(err, session) {
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
      client.session.sid = sid;
      if (client.sessionCreated) {
        application.databases.security.category('sessions')
                   .new(client.session
        , function(/*err*/) {
          client.sessionCreated = false;
          client.sessionModified = false;
          callback();
        });
      } else if (client.sessionModified) {
        application.databases.security.category('sessions')
                   .update({ sid: sid }, client.session
        , function(/*err*/) {
          client.sessionCreated = false;
          client.sessionModified = false;
          callback();
        });
      } else callback();
    } else callback();
  };

  // Delete session from database
  //
  application.security.deletePersistentSession = function(client, sid, callback) {
    if (application.security.hasDb()) {
      application.databases.security.category('sessions')
                 .delete({ sid: sid }, true, callback);
    } else callback();
  };

};
