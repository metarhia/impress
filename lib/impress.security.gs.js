'use strict';


// GlobalStorage security provider for Impress Application Server
//
impress.security.gs = {};

//Mixin security to application instance
//
impress.security.gs.mixin = function(application) {
  var gs = application.databases.security.connection;

  // Register user, return true/false
  //   callback(err, signUpInfo)
  //
  //   userInfo:   { login, password, group }
  //
  //   signUpInfo: { user, session }
  //
  application.security.signUp = function(userInfo, callback) {
    var login = userInfo.login,
        password = userInfo.password;
    application.security.hash(password, function(err, hashedPassword) {
      gs.create({
        login: login,
        hashedPassword: hashedPassword,
        group: userInfo.group,
        category: 'users',
      }, function(err, result) {
        if (!err && result.ops.length > 0) {
          var resultUser = result.ops[0];
          resultUser.id = resultUser._id.toString();
          resultUser.password = password;
          var user = new application.security.User(resultUser);
          application.users[user.login] = user;
          var session = new application.security.Session({
            login: user.login,
          });
          application.security.saveSession(session, function(err, saveResult) {
            if (err) {
              return callback(err);
            }
            callback(null, {
              session: session,
              user: user,
            });
          });
        } else {
          callback(err || new Error('User was not inserted to database'));
        }
      });
    });
  };

  application.security.saveSession = function(session, callback) {
    var sid = session.sid;
    application.sessions[sid] = session;
    session._id = sid;
    session.category = 'sessions';
    gs.create(session, function(err, result) {
      if (err) {
        return callback(err);
      }
      callback(null, result);
    });
  };

  application.security.restoreSession = function(sid, callback) {
    gs.get(sid, function(err, session) {
      if (err) {
        return callback(err);
      }
      application.sessions[sid] = session;
      callback(null, session);
    });
  };

  // SignIn user
  //   callback(err, sid)
  // userInfo = { login, password, group }
  //
  application.security.signIn = function(userInfo, callback) {
    application.security.verify(userInfo, function(err, user) {
      if (err) {
        return callback(err);
      }
      var session = new application.security.Session({ 
        login: userInfo.login
      });
      application.security.saveSession(session, callback);
    });
  };

  application.security.signOut = function(sid, callback) {
    delete application.sessions[sid];
    gs.delete(sid, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, true);
    });
  };


  // Verify user information
  //   callback(err, isSuccessfull)
  //
  //   userInfo: {
  //     login,
  //     password,
  //     group,
  //   }
  //
  application.security.verify = function(userInfo, callback) {
    var login = userInfo.login,
        password = userInfo.password,
        group = userInfo.group;
    gs.find({ login: login, category: 'users' }, function(err, users) {
      if (users.length === 0) {
        return callback(new Error('Wrong login'));
      }
      api.metasync.find(users, function(user, callback) {
        api.bcrypt.compare(password, user.hashedPassword, function(err, isMatch) {
          callback(err || (isMatch && group === user.group));
        });
      }, function(user) {
        if (user === undefined) {
          return callback(new Error('Wrong password or group'));
        }
        callback(null, user);
      });
    });
  };

};
