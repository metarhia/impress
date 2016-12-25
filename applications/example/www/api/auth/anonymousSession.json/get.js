(client, callback) => {
  client.startSession();
  callback({ sid: client.sid });
}
