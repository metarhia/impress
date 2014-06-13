module.exports = {
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

            }catch (e) { console.trace(); }
        }
    }
};
