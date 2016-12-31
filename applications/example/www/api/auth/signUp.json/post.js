(client, callback) => {
  client.signUp(
    client.fields.email,
    client.fields.password,
    (err, user) => {
      callback({ result: user ? 'ok' : 'error' });
    }
  );
}
