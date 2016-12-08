(client, callback) => {
  client.getUser(client.fields.email, function(err, user) {
    callback({ email: !user });
  });
}