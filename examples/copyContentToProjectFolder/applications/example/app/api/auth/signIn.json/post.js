module.exports = function(client, callback) {

  security.signIn(client, client.fields.Login, client.fields.Password, function(isSuccess) {
    if (isSuccess) client.context.data = { Result: "Ok" };
    else client.context.data = { Result: "Error" };
    if (client.fields.loginForm) client.redirect("/");
    callback();
  });

}