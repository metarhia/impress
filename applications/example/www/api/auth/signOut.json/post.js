module.exports = function(client, callback) {
  client.context.data = { result: 'ok' };
  client.signOut(callback);
};
