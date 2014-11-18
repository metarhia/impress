module.exports = function(client, callback) {
  client.eventChannel = 'TestEvent';
  client.eventHeartbeat = 60000;
  callback();
}
