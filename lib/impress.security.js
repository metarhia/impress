'use strict';

impress.security = {};
api.security = impress.security;

// User class
//
impress.security.User = function(application) {
  this.application = application;
};

// Session class
//
impress.security.Session = function(application) {
  this.application = application;
};

// Mixin security to application instance
//
impress.security.mixinApplication = function(application) {

  application.security = {};
  application.security.User = impress.security.User;

  // Get user for given session or {}
  //
  application.security.getSessionUser = function(sid) {
    var userId = application.sessions[sid].userId;
    if (userId) return application.users[userId];
    else return new application.security.User(application);
  };

  // User SignIn
  //   post request should contain 'Login' and 'Password' fields
  //   callback(isSuccess)
  //
  application.security.signIn = function(client, login, password, callback) {
    impress.security.getUser(client, login, function(err, user) {
      if (user && (user.password === password)) {
        client.startSession();
        if (!client.application.users[user.userId]) client.application.users[user.userId] = user;
        client.session.userId = user.userId;
        client.session.login = user.login;
        if (user.group) client.session.group = user.group;
        client.sessionModified = true;
        client.logged = true;
        callback(true);
      } else callback(false);
    });
  };

  // User SignOut (session remains)
  //
  application.security.signOut = function(client, callback) {
    if (client.session) {
      var userId = client.session.userId;
      if (userId) {
        var user = client.application.users[userId];
        if (user && user.sessions) delete user.sessions[client.sid];
      }
      if (client.session.userId) delete client.session.userId;
      if (client.session.login)  delete client.session.login;
      if (client.session.group)  delete client.session.group;
      client.sessionModified = true;
      client.logged = false;
      client.user = null;
      callback(true);
    } else callback(false);
  };

};

impress.security.generateKey = function() {
  var chars = 'abcdefghijklmnopqrstuvwxyz',
      nums = '0123456789';
  return (
    api.impress.generateKey(2, chars) +
    api.impress.generateKey(2, nums) +
    api.impress.generateKey(2, chars) +
    api.impress.generateKey(2, nums)
  );
};

var singleWarning = true;

function showWarning() {
  if (singleWarning) {
    console.log('Security provider not loaded'.red.bold);
    singleWarning = false;
  }
}

impress.security.createDataStructures = function(callback) {
  showWarning();
  if (callback) callback();
};

impress.security.dropDataStructures = function(callback) {
  showWarning();
  if (callback) callback();
};

impress.security.emptyDataStructures = function(callback) {
  showWarning();
  if (callback) callback();
};

impress.security.register = function(client, callback) {
  showWarning();
  if (callback) callback();
};

impress.security.getUser = function(client, login, callback) {
  showWarning();
  if (callback) callback();
};

impress.security.getUserById = function(client, userId, callback) {
  showWarning();
  if (callback) callback();
};

impress.security.restorePersistentSession = function(client, sid, callback) {
  showWarning();
  if (callback) callback();
};

impress.security.savePersistentSession = function(client, sid, callback) {
  showWarning();
  if (callback) callback();
};

impress.security.deletePersistentSession = function(client, sid, callback) {
  showWarning();
  if (callback) callback();
};
