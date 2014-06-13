"use strict";

(function(impress) {

    impress.passport = impress.passport || {};

	impress.passport.mixinApplication = function (application) {
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
				providers[providerName].param.passReqToCallback = true;
				passport.use(providerId, new provider.strategy(provider.param, provider.authenticate));
				strategies[providerName] = {
					authenticate: passport.authenticate(providerId, { scope: "profile" }),
					authenticateCallback: passport.authenticate(providerId, {
						successRedirect: '/api/auth/userInfo.json',
						failureRedirect: '/'
					})
				};
			}
			application.passport.mixinClient = function(client) {
				client.passport = {};
				client.passport.strategies = strategies;
				client.req.query = client.query;
				client.res.redirect = function (url) { client.redirect(url); client.res.end(); };
				client.passport.init = function() {
					if (!client.session) client.startSession();
					client.req.session = client.application.sessions[client.session];
					impress.async.eachSeries(handlers, function(handler, callback) {
						handler(client.req, client.res, callback);
					}, function(err) {
						client.processing();
					});
				}
			};
		}
	};

} (global.impress = global.impress || {}));