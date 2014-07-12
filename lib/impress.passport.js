"use strict";

// Additional dependencies:
//   "passport": "^0.2.0"
//
// Optional dependencies:
//   "passport-google-oauth": "^0.1.5"
//   "passport-facebook": "^1.0.3"
//   "passport-twitter": "^1.0.2"

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
			application.passport.mixinClient = function(client) {
				client.passport = {};
				client.passport.init = function(callback) {
					if (client.session) {
						client.passport.strategies = strategies;
						client.req.query = client.query;
			    
						client.res._end = client.res.end;
						client.res.redirect = function (url) {
							client.redirect(url);
							client.saveSession(function() {
								client.res._end();
							});
						};
						client.res.end = function (data) {
							client.saveSession(function() {
								client.res._end(data);
							});
						};
						client.req.session = client.application.sessions[client.session];
						impress.async.eachSeries(handlers, function(handler, cb) {
							handler(client.req, client.res, cb);
						}, function(err) {
							if (client.req.user) {
								client.logged = true;
								client.user = client.req.user;
							}
							callback();
						});
					} else {
						client.startSession();
						var session = client.application.sessions[client.session];
						session.sessionCreated = true;
						session.sessionModified = true;
						client.redirect(client.url);
						callback(new Error("No session, starting new"));
					}
				};
			};
		}
	}
};