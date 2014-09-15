module.exports = function(client, callback) {
  client.passportInit(function () {
    client.passport.strategies.facebook.authenticateCallback(client.req, client.res, callback);
  }, callback);
};