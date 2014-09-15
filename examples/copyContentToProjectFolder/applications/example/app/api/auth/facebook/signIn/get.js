module.exports = function(client, callback) {
  client.passportInit(function () {
    client.passport.strategies.facebook.authenticate(client.req, client.res, callback);
  }, callback);
};