module.exports = function(client, callback) {
  application.nextUserId = application.nextUserId || 1;
  client.startSession();
  client.session.userName = client.session.userName || 'user' + application.nextUserId++;
  callback({ name: client.session.userName });
}
