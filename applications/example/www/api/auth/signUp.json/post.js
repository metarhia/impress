(client, callback) => {
  client.signUp(
    client.fields.email,
    client.fields.password,
    function(err, user) {
      callback({ result: user ? 'ok' : 'error' });
    }
  );
}