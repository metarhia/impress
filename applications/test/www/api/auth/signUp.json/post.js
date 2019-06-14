(client, callback) => {
  application.security.signUp(
    client,
    client.fields.email,
    client.fields.password,
    err => {
      if (err) callback(err, { result: 'error' });
      else callback(null, { result: 'ok' });
    }
  );
};
