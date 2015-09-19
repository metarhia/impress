module.exports = function(client, callback) {
  application.security.register(client, client.fields.email, client.fields.password, function(err, user) {
    callback({ result: user ? 'ok' : 'error' });
  });
};
