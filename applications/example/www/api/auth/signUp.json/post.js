(client, callback) => {
  client.signUp(
    client.fields.email,
    client.fields.password,
    (err, user) => {
      callback(err, { result: user ? 'ok' : 'error' });
    }
  );
}
