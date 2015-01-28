module.exports = function(client, callback) {
  application.security.register(client, client.fields.Email, client.fields.Password, function(err, user) {
    if (user) client.context.data = { Result: 'Ok' };
    else client.context.data = { Result: 'Error' };
    callback();
  });
};
