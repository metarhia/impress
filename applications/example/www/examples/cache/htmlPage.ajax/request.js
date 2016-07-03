(client, callback) => {
  client.cache('30s');
  callback();
}