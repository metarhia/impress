"use strict";

// Additional npm dependencies:
//   passport
//
// Optional dependencies:
//   passport-google-oauth
//   passport-facebook
//   passport-twitter

impress.passport = {};

impress.passport.mixinApplication = function (application) {
  if (application.config.passport) {
    application.passport = {};
    var passport = application.config.passport.lib,
        strategies = {},
        handlers = [passport.initialize(), passport.session()],
        providers = application.config.passport.strategies;
    if (providers) {
      var provider, providerId;
      for (var providerName in providers) {
        provider = providers[providerName];
        providerId = application.name+'/'+providerName;
        provider.param.passReqToCallback = true;
        passport.use(providerId, new provider.strategy(provider.param, provider.authenticate));
        strategies[providerName] = {
          authenticate: passport.authenticate(providerId, { scope: provider.scope || '' }),
          authenticateCallback: passport.authenticate(providerId, {
            successRedirect: provider.successRedirect,
            failureRedirect: provider.failureRedirect
          })
        };
      }

      application.Client.prototype.passport = {};
      
      application.Client.prototype.passportInit = function(callback) {
        var client = this;
        if (client.session) {
          client.passport.strategies = strategies;
          client.req.query = client.query;

          client.res._end = client.res.end;
          client.res.redirect = function (location) {
            client.redirect(location);
            client.saveSession(function() {
              client.res._end();
            });
          };
          client.res.end = function (data) {
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
    }
  }
};
