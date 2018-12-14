(client, callback) => {
  client.cache(Duration('30s'));
  callback();
}
