module.exports = function(client, callback) {
  client.passportInit(function () {
    client.passport.strategies.twitter.authenticate(client.req, client.res, callback);
  }, callback);
};