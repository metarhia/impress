(client, callback) => {
  console.debug('Cached Error');
  console.debug(client.err);
  callback();
}
