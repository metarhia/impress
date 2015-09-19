module.exports = function(client, callback) {
  client.context.data = { result: 'ok' };
  application.security.signOut(client, callback);
};
