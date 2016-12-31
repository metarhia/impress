(client, callback) => {
  client.getUser(client.fields.email, (err, user) => {
    callback({ email: !user });
  });
}
