module.exports = function(client, callback) {
  application.security.getUser(client, client.fields.Email, function(err, user) {
    callback({ Email: !user });
  });
};
