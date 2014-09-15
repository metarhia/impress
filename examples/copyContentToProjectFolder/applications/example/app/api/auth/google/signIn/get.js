module.exports = function(client, callback) {
  client.passportInit(function () {
    client.passport.strategies.google.authenticate(client.req, client.res, callback);
  }, callback);
};