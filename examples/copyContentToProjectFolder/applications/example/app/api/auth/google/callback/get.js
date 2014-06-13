module.exports = function(client, callback) {
    client.passport.google.authenticateCallback(client.req, client.res);
};