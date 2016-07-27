if (api.passport) {

  // used to serialize the user for the session
  api.passport.serializeUser(function(user, done) {
    done(null, user);
  });

  // used to deserialize the user
  api.passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  module.exports = {
    strategies: {
      google: {
        param: {
          clientID: '-place-id-here-',
          clientSecret: '-place-secret-here-',
          callbackURL: '/api/auth/google/callback'
        },
        strategy: api.passportGoogle.OAuth2Strategy,
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
        },
        successRedirect: '/api/auth/userInfo.json',
        failureRedirect: '/'
      }
    }
  };

}