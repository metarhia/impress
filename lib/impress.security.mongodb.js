'use strict';

// Mixin security to application instance
//
api.impress.override(impress.security, function mixinApplication(application) {

  mixinApplication.inherited(application);

  application.security.hasDbWarned = false;

  // Is application has security DB configured
  //
  application.security.hasDb = function() {
    var result = api.impress.getByPath(application, 'databases.security.sessions');
    if (!result && !application.security.hasDbWarned) {
      console.log('  No security database configured or can not connect to db'.red.bold);
      application.security.hasDbWarned = true;
    }
    return result;
  };

  // Create collections and indexes for security subsystem in MongoDB
  //
  application.security.createDataStructures = function(callback) {
    console.log('Impress'.green.bold + ' installing initial data structures to MongoDB...'.green);
    if (!db.mongodb) console.log('  No MongoDB drivers found'.red.bold);
    if (!db.mongodb.schema) console.log('  No MongoDB schema plugin loaded'.red.bold);
    else {
      var securitySchema = api.definition.require('impress.security.schema');
      if (!securitySchema) console.log('  No Impress security database schema for MongoDB loaded'.red.bold);
      else if (!application.security.hasDb()) console.log('  Can not generate MongoDB database structure'.red.bold);
      else {
        var rl = api.readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.question('Delete stored data and recreate default structures? [y/n]: ', function(answer) {
          rl.close();
          if (answer === 'y') db.mongodb.schema.generateSchema(application.databases.security, securitySchema, true);
          else console.log('  Data is not changed. Bye!'.green);
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
  application.security.register = function(client, email, password, callback) {
    application.security.getUser(client, email, function(err, user) {
      if (!user) {
        if (application.security.hasDb()) {
          if (!password) password = impress.security.generateKey();
          application.databases.security.users.insert({
            login: email,
            password: password,
            group: 'users'
          }, function(err, users) {
            var user;
            if (!err && users.length > 0) {
              user = new application.User(users[0]);
              client.startSession();
              client.session.login = user.login;
              client.sessionModified = true;
              client.logged = true;
              application.users[user.login] = user;
            }
            callback(null, user);
          });
        } else callback();
      } else callback(new Error('Email already registered'), user);
    });
  };

  // Get user record from database
  //   callback(user)
  // 
  application.security.getUser = function(client, login, callback) {
    if (application.security.hasDb()) {
      application.databases.security.users.findOne({ login: login }, function(err, node) {
        if (node) callback(err, new application.User(node));
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
          session = new application.Session(session);
          application.sessions[sid] = session;
          if (login) {
            if (application.users[login]) {
              application.users[login].sessions.push(sid);
              callback(null, session);
            } else {
              application.security.getUser(client, login, function(err, node) {
                if (node) {
                  var user = new application.User(node);
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
    if (application.security.hasDb()) {
      if (client.session) {
        client.session.sid = sid;
        if (client.sessionCreated) {
          application.databases.security.sessions.insert(client.session, function(/*err*/) {
            client.sessionCreated = false;
            client.sessionModified = false;
            callback();
          });
        } else if (client.sessionModified) {
          application.databases.security.sessions.update({ sid: sid }, client.session, function(/*err*/) {
            client.sessionCreated = false;
            client.sessionModified = false;
            callback();
          });
        } else callback();
      } else callback();
    } else callback();
  };

  // Delete session from database
  //
  application.security.deletePersistentSession = function(client, sid, callback) {
    if (application.security.hasDb()) application.databases.security.sessions.remove({ sid: sid }, true, callback);
    else callback();
  };

});
