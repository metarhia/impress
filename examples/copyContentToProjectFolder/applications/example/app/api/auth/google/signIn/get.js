module.exports = function(client, callback) {
    client.passport.google.authenticate(client.req, client.res);
};