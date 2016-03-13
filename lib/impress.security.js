'use strict';

// Security plugin for Impress Application Server

// User class
//   user - an object from storage provider we need to copy all parameters from
//
impress.security.User = function(user) {
  if (user) {
    this.id = user.id; // user id in storage provider
    this.login = user.login; // login should be also unique
    this.password = user.password;
    this.group = user.group;
    this.data = user.data || {}; // user stored data
  }
  this.sessions = []; // array of sid, one user can have many sessions
  this.ips = []; // array of ip in integer form
  this.sse = {}; // SSE/EventStream sockets to send events
  this.access = Date.now(); // last access time
};

// Session class
//   session - an object from storage provider we need to copy all parameters from
//
impress.security.Session = function(session) {
  this.login = session.login;
  this.sid = session.sid;
  this.data = session.data || {}; // session stored data
};

// Load driver
//   driverName - driver name, e.g. mongodb, mysql, pgsql, mamcached
//   returns - driver object
//
impress.security.getDatabaseProvider = function(driverName) {
  var driver = impress.security[driverName];
  if (!driver) {
    require('./impress.security.' + driverName);
    driver = impress.security[driverName];
  }
  return driver;
};

// Mixin security to application instance
//
impress.security.mixin = function(application) {

  application.User = impress.security.User;
  application.Session = impress.security.Session;

  var singleWarning = true;

  // Print warning to stdout
  //
  function showWarning() {
    if (singleWarning) {
      application.log.warning('Security provider can`t be loaded');
      singleWarning = false;
    }
  }

  // Get user for given session or {}
  //
  application.security.getSessionUser = function(sid) {
    var login = application.sessions[sid].login;
    if (login) return application.users[login];
    else return null;
  };

  // User SignIn
  //   post request should contain 'Login' and 'Password' fields
  //   callback(isSuccess)
  //
  application.security.signIn = function(client, login, password, callback) {
    application.security.getUser(client, login, function(err, user) {
      if (user && (user.password === password)) {
        client.startSession();
        if (!client.application.users[user.login]) {
          client.application.users[user.login] = user;
        }
        client.session.login = user.login;
        if (user.group) {
          client.session.group = user.group;
        }
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
        if (user && user.sessions) {
          delete user.sessions[client.sid];
        }
      }
      if (client.session.login) {
        delete client.session.login;
      }
      if (client.session.group) {
        delete client.session.group;
      }
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
    callback();
  };

  application.security.getUser = function(client, login, callback) {
    showWarning();
    callback();
  };

  application.security.restorePersistentSession = function(client, sid, callback) {
    showWarning();
    callback();
  };

  application.security.savePersistentSession = function(client, sid, callback) {
    showWarning();
    callback();
  };

  application.security.deletePersistentSession = function(client, sid, callback) {
    showWarning();
    callback();
  };

  // Mixin security database provider when the databases are ready
  //
  application.on('databasesOpened', function() {
    if (application.databases && application.databases.security) {
      var provider = impress.security.getDatabaseProvider(
        application.databases.security.schema
      );
      if (provider) provider.mixin(application);
    }
  });

};

// Generate password
//
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
