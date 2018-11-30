(client, callback) => {
  client.startSession();
  callback(null, { sid: client.sid });
}
