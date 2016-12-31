(client, callback) => {
  client.signIn(
    client.fields.Login,
    client.fields.Password,
    (isSuccess) => {
      if (client.fields.loginForm) client.redirect('/');
      callback({ result: isSuccess ? 'ok' : 'error' });
    }
  );
}
