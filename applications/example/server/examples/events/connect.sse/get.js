module.exports = function(client, callback) {
  client.eventChannel = 'TestEvent';
  client.heartbeat = true;
  callback();
};
