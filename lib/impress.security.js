'use strict';

impress.security = {};
api.security = impress.security;

// User class
//
impress.security.User = function() {
  // id - unique identifier
  // login - from db (optional)
  // password - from db (optional)
  // group - from db (optional)
  this.sessions = []; // one user can have many sessions
  this.data = {}; // user accessed data cache
  this.sse = {}; // SSE/EventStream sockets to send events
  this.access = new Date(); // last access time
};

// Session class
//
impress.security.Session = function() {
  this.login = '';
  this.sid = '';
};

var singleWarning = true;

function showWarning() {
  if (singleWarning) {
    console.log('Security provider not loaded'.red.bold);
    singleWarning = false;
  }
}

// Mixin security to application instance
//
impress.security.mixinApplication = function(application) {

  application.security = {};
  application.User = impress.security.User;
  application.Session = impress.security.Session;

  // Get user for given session or {}
  //
  application.security.getSessionUser = function(sid) {
    var login = application.sessions[sid].login;
    if (login) return application.users[login];
    else return null; // !!! new application.security.User(application);
  };

  // User SignIn
  //   post request should contain 'Login' and 'Password' fields
  //   callback(isSuccess)
  //
  application.security.signIn = function(client, login, password, callback) {
    application.security.getUser(client, login, function(err, user) {
      if (user && (user.password === password)) {
        client.startSession();
        if (!client.application.users[user.login]) client.application.users[user.login] = user;
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
      var login = client.session.login;
      if (login) {
        var user = client.application.users[login];
        if (user && user.sessions) delete user.sessions[client.sid];
      }
      if (client.session.login) delete client.session.login;
      if (client.session.group) delete client.session.group;
      client.sessionModified = true;
      client.logged = false;
      client.user = null;
      callback(true);
    } else callback(false);
  };

  application.security.createDataStructures = function(callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.dropDataStructures = function(callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.emptyDataStructures = function(callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.register = function(client, callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.getUser = function(client, login, callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.restorePersistentSession = function(client, sid, callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.savePersistentSession = function(client, sid, callback) {
    showWarning();
    if (callback) callback();
  };

  application.security.deletePersistentSession = function(client, sid, callback) {
    showWarning();
    if (callback) callback();
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
