module.exports = function(client, callback) {
  client.passportInit(function () {
    client.passport.strategies.twitter.authenticateCallback(client.req, client.res, callback);
  }, callback);
};