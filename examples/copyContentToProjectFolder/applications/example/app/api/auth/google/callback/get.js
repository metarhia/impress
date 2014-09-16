module.exports = function(client, callback) {
  client.passportInit(function () {
    client.passport.strategies.google.authenticateCallback(client.req, client.res, callback);
  }, callback);
};