module.exports = function(client, callback) {
  application.security.signIn(client, client.fields.Login, client.fields.Password, function(isSuccess) {
    if (client.fields.loginForm) client.redirect('/');
    callback({ result: isSuccess ? 'ok' : 'error' });
  });
};
