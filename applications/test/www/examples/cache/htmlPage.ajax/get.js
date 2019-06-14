(client, callback) => {
  client.cache(Duration('30s'));
  console.debug('Page stored in cache for 30 sec');
  callback();
};
