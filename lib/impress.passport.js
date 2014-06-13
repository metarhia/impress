"use strict";

(function(impress) {

    var passport = require('passport');

    impress.passport = impress.passport || {};

	// used to serialize the user for the session
	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	// used to deserialize the user
	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	impress.passport.mixinApplication = function (application) {
		application.passport = {};
		var strategies = {},
			handlers = [passport.initialize(), passport.session()],
			config = application.config.passport;
		if (config) {
			var settings;
			for (var auth in config) {
				settings = config[auth];
				config[auth].param.passReqToCallback = true;
				passport.use(auth, new settings.strategy(settings.param, settings.authenticate));
				strategies[auth] = {
					authenticate: passport.authenticate('google', { scope: "profile" }),
					authenticateCallback: passport.authenticate('google', {
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