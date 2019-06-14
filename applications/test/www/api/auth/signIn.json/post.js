(client, callback) => {
  application.security.signIn(
    client,
    client.fields.Login,
    client.fields.Password,
    err => {
      client.redirect('/');
      if (err) callback(err, { result: 'error' });
      else callback(null, { result: 'ok' });
    }
  );
};
