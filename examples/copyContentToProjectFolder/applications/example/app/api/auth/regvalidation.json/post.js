module.exports = function(client, callback) {

  security.getUser(client, client.fields.Email, function(err, user) {
    callback({ Email: !user });
  });

}