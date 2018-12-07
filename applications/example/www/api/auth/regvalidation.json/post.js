(client, callback) => {
  application.security.getUser(client.fields.email, (err, user) => {
    callback(err, { email: !user });
  });
}
