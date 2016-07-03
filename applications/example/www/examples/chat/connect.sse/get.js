(client, callback) => {
  client.eventChannel = 'chat';
  client.heartbeat = true;
  callback();
}