"use strict";

// TODO: test security against v0.1.1

impress.security = {};
api.security = impress.security;

// session is associated with user if optional field session.userId present and not null

impress.security.user = function(aUser) {
  return extend(aUser || {}, {
    // userId:   '', // unique identifier
    // login:    '', // from db (optional)
    // password: '', // from db (optional)
    // group:    '', // from db (optional)
    sessions:  [], // one user can have many sessions
    data:      {}, // user accessed data cache
    sse:       {}, // SSE/EventStream sockets to send events
    access:    new Date() // last access time
  });
};

impress.security.generateKey = function() {
  var chars = 'abcdefghijklmnopqrstuvwxyz',
      nums = '0123456789';
  return generateKey(2,chars)+generateKey(2,nums)+generateKey(2,chars)+generateKey(2,nums);
};

// Get user for given session or {}
//
impress.security.getSessionUser = function(application, sid) {
  var userId = application.sessions[sid].userId;
  return userId ? application.users[userId] : {};
};

var singleWarning = true;

function showWarning() {
  if (singleWarning) {
    console.log('Security provider not loaded'.bold.red);
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

// User SignIn
//   post request should contain 'Login' and 'Password' fields
//   callback(isSuccess)
//
impress.security.signIn = function(client, login, password, callback) {
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
impress.security.signOut = function(client, callback) {
  if (client.session) {
    var userId = client.session.userId,
        sessions = client.application.sessions;
    if (userId && client.application.users[userId] && client.application.users[userId].sessions) {
      delete client.application.users[userId].sessions[client.sid];
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
