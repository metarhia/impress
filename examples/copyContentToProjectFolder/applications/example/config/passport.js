if (global.passport) {

	var p = require('passport'),
		pGoogle = require('passport-google-oauth');

	// used to serialize the user for the session
	p.serializeUser(function(user, done) {
		done(null, user);
	});

	// used to deserialize the user
	p.deserializeUser(function(user, done) {
		done(null, user);
	});

	module.exports = {
		lib: p,
		strategies: {
		    google: {
		        param: {
	    	        clientID: '791494201012-uecv1djmhgp4fjmca9v0os5c4f8omsk0.apps.googleusercontent.com',
		            clientSecret: 'Q4I-Z6YNgtouBAsg7NPM3gXd',
		            callbackURL: '/api/auth/google/callback'
		        },
		        strategy: pGoogle.OAuth2Strategy,
		        authenticate: function(req, token, refreshToken, profile, done) {
		            try {
		                if (!req.user) {
		                    // validate request and find user ...
		                    // if (err) done(err)
		                    // else
		                    done(null, profile);
		                } else {
		                    done(null, req.user);
		                }
		
		            } catch (e) { console.trace(); }
		        }
		    }
		}
	};

}