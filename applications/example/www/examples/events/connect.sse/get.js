(client, callback) => {
  client.eventChannel = 'test';
  client.heartbeat = true;
  callback();
}