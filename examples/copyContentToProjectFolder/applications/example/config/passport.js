if (passport) {

	var passport = require('passport');

	// used to serialize the user for the session
	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	// used to deserialize the user
	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	module.exports = {
		lib: passport,
		strategies: {
		    google: {
		        param: {
	    	        clientID: '791494201012-uecv1djmhgp4fjmca9v0os5c4f8omsk0.apps.googleusercontent.com',
		            clientSecret: 'Q4I-Z6YNgtouBAsg7NPM3gXd',
		            callbackURL: '/api/auth/google/callback'
		        },
		        strategy: require('passport-google-oauth').OAuth2Strategy,
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