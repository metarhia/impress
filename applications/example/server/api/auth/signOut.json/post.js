module.exports = function(client, callback) {
  client.context.data = { Result: 'Ok' };
  application.security.signOut(client, callback);
};
