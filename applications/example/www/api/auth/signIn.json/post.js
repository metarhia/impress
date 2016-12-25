(client, callback) => {
  client.signIn(
    client.fields.Login,
    client.fields.Password,
    function(isSuccess) {
      if (client.fields.loginForm) client.redirect('/');
      callback({ result: isSuccess ? 'ok' : 'error' });
    }
  );
}
