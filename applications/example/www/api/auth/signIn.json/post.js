(client, callback) => {
  client.signIn(
    client.fields.Login,
    client.fields.Password,
    (err, isSuccess) => {
      if (client.fields.loginForm) client.redirect('/');
      callback(err, { result: isSuccess ? 'ok' : 'error' });
    }
  );
}
