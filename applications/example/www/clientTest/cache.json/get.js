(client, callback) => {
  client.cache(Duration('10s'));
  callback(null, { clientStartTime: client.startTime });
}
