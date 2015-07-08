module.exports = function(client, callback) {
  client.eventChannel = 'test';
  client.heartbeat = true;
  callback();
};
