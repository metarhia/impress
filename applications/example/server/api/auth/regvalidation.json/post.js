module.exports = function(client, callback) {
  application.security.getUser(client, client.fields.email, function(err, user) {
    callback({ email: !user });
  });
};
