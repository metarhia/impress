'use strict';

// Passport plugin for Impress Application Server
//

// Additional npm dependencies:
//   passport
//
// Optional dependencies:
//   passport-google-oauth
//   passport-facebook
//   passport-twitter

impress.passport = {};

// Passport pligin definition
//
impress.passport.mixinApplication = function(application) {

  var providers = api.impress.getByPath(application, 'config.passport.strategies');
  if (!providers || !api.passport) return;

  application.passport = {};
  var provider, providerName, providerId, strategies = {},
      handlers = [api.passport.initialize(), api.passport.session()];
  for (providerName in providers) {
    provider = providers[providerName];
    providerId = application.name + '/' + providerName;
    provider.param.passReqToCallback = true;
    api.passport.use(providerId, new provider.strategy(provider.param, provider.authenticate));
    strategies[providerName] = {
      authenticate: api.passport.authenticate(providerId, { scope: provider.scope || '' }),
      authenticateCallback: api.passport.authenticate(providerId, {
        successRedirect: provider.successRedirect,
        failureRedirect: provider.failureRedirect
      })
    };
  }

  application.Client.prototype.passport = {};
  
  // Call from handler to initialize passport data structures
  //
  application.Client.prototype.passportInit = function(callback) {
    var client = this;
    if (client.session) {
      client.passport.strategies = strategies;
      client.req.query = client.query;

      client.res._end = client.res.end;
      client.res.redirect = function(location) {
        client.redirect(location);
        client.saveSession(function() {
          client.res._end();
        });
      };
      client.res.end = function(data) {
        client.saveSession(function() {
          client.res._end(data);
        });
      };
      client.req.session = client.session;
      api.async.eachSeries(handlers, function(handler, cb) {
        handler(client.req, client.res, cb);
      }, function() {
        if (client.req.user) {
          client.logged = true;
          client.user = client.req.user;
        }
        callback();
      });
    } else {
      client.startSession();
      client.sessionCreated = true;
      client.sessionModified = true;
      client.redirect(client.url);
      callback(new Error('No session, starting new'));
    }
  };


};
