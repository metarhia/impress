'use strict';

impress.security.user = impress.security.user.override(function(user) {
  user = this.inherited(user);
  user.userId = user._id;
  delete user._id;
  return user;
});

impress.security.hasDb = function(application) {
  var result = application.databases && application.databases.security;
  if (!result) console.log('  No security database configured'.red.bold);
  return result;
};

impress.security.createDataStructures = function(application, callback) {
  console.log('Impress'.green.bold + ' installing initial data structures to MongoDB...'.green);
  if (!db.mongodb) console.log('  No MongoDB drivers found'.red.bold);
  else if (!db.mongodb.schema) console.log('  No MongoDB schema plugin loaded'.red.bold);
  else {
    var securitySchema = api.definition.require('impress.security.schema');
    if (!securitySchema) console.log('  No Impress security database schema for MongoDB loaded'.red.bold);
    else if (!impress.security.hasDb(application)) console.log('  Can not generate MongoDB database structure'.red.bold);
    else {
      var rl = api.readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Delete stored data and recreate default structures? [y/n]: ', function(answer) {
        rl.close();
        if (answer === 'y') db.mongodb.schema.generateSchema(application.databases.security, securitySchema, true);
        else console.log('  Data is not changed. Bye!'.green);
      });
    }
  }
};

impress.security.dropDataStructures = function(application, callback) {
  if (callback) callback();
};

impress.security.emptyDataStructures = function(application, callback) {
  if (callback) callback();
};

// Register user, return true/false
//   http post should contain 'Email' and 'Password' fields
//   callback(err, user)
//
// client.fields.Password
// client.fields.Email

impress.security.register = function(client, email, password, callback) {
  impress.security.getUser(client, email, function(err, user) {
    if (!user) {
      if (impress.security.hasDb(client.application)) {
        if (!password) password = impress.security.generateKey();
        client.application.databases.security.users.insert({
          login: email,
          password: password,
          group: 'users'
        }, function(err, users) {
          var user;
          if (!err && users.length > 0) {
            user = impress.security.user(users[0]);
            // if (impress.sendPassword) impress.sendPassword(client.filds.Email);
            client.startSession();
            client.application.users[user.userId] = user;
            client.session.userId = user.userId;
            client.session.login = user.login;
            if (user.group) client.session.group = user.group;
            client.sessionModified = true;
            client.logged = true;
          }
          if (callback) callback(null, user);
        });
      } else callback();
    } else if (callback) callback(new Error('Email already registered'), user);
  });
};

// Get user record from database
//   callback(user)
// 
impress.security.getUser = function(client, login, callback) {
  if (impress.security.hasDb(client.application)) {
    client.application.databases.security.users.findOne({ login: login }, function(err, node) {
      if (node) callback(err, impress.security.user(node));
      else callback(err, null);
    });
  } else callback();
};

// Get user record from database
//   callback(user)
// 
impress.security.getUserById = function(client, userId, callback) {
  if (impress.security.hasDb(client.application)) {
    client.application.databases.security.users.findOne({ $or: [ { _id: userId }, { userId: userId } ] }, function(err, node) {
      callback(err, impress.security.user(node));
    });
  } else callback();
};

// Restore session from database if available
//   callback(err, session)
//
impress.security.restorePersistentSession = function(client, sid, callback) {
  if (impress.security.hasDb(client.application)) {
    client.application.databases.security.sessions.findOne({ sid: sid }, function(err, session) {
      if (session) {
        var userId = session.userId;
        delete session._id;
        client.application.sessions[sid] = session;
        if (userId) {
          if (client.application.users[userId]) {
            client.application.users[userId].sessions.push(sid);
            callback(null, session);
          } else {
            impress.security.getUserById(client, userId, function(err, node) {
              if (node) {
                var user = impress.security.user(node);
                user.sessions.push(sid);
                client.application.users[userId] = user;
              } else {
                delete client.application.sessions[sid].userId;
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
impress.security.savePersistentSession = function(client, sid, callback) {
  if (impress.security.hasDb(client.application)) {
    if (client.session) {
      client.session.sid = sid;
      if (client.sessionCreated) {
        client.application.databases.security.sessions.insert(
          client.session, function(err) {
            client.sessionCreated = false;
            client.sessionModified = false;
            callback();
          }
        );
      } else if (client.sessionModified) {
        client.application.databases.security.sessions.update(
          { sid: sid }, client.session,  function(err) {
            client.sessionCreated = false;
            client.sessionModified = false;
            callback();
          }
        );
      } else callback();
    } else callback();
  } else callback();
};

// Delete session from database
//
impress.security.deletePersistentSession = function(client, sid, callback) {
  if (impress.security.hasDb(client.application)) {
    client.application.databases.security.sessions.remove({ sid: sid }, true, function(err) {
      if (callback) callback();
    });
  } else callback();
};
