(client, callback) => {
  client.getUser(client.fields.email, (err, user) => {
    callback(err, { email: !user });
  });
}
