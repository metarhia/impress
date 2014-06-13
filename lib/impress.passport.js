"use strict";

(function(impress) {
    impress.mixinPassport = function (application) {
        var requirePath = require.resolve('passport'),
            strategies = {};
        require.cache[requirePath] = null;

        var passport = require('passport'), //return object
            handlers  = [passport.initialize(), passport.session()],
            config = application.config.passport;

        for (var auth in config) {
            var settings = config[auth];
            config[auth].param.passReqToCallback = true;
            passport.use(auth, new settings.strategy(settings.param, settings.authenticate));

            strategies[auth] = {
                authenticate: passport.authenticate('google', { scope: "profile" }),
                authenticateCallback: passport.authenticate('google', {
                    successRedirect : '/api/auth/userInfo.json',
                    failureRedirect : '/'
                })
            };
        }

        // used to serialize the user for the session
        passport.serializeUser(function(user, done) {
            done(null, user);
        });

        // used to deserialize the user
        passport.deserializeUser(function(user, done) {
            done(null, user);
        });

        application.mixinPassport = function(client) {
            client.passport = strategies;
            client.req.query = client.query;
            client.res.redirect = function (url) { client.redirect(url); client.res.end(); };

            client.initPassport = function() {
                if (!client.session) client.startSession();
                client.req.session = client.application.sessions[client.session];

                impress.async.eachSeries(handlers, function(handler, callback) {
                    handler(client.req, client.res, callback);
                }, function(err) {
                    client.processing();
                });
            }
        };
    };

} (global.impress = global.impress || {}));
