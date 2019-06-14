(client, callback) => {
  client.cache(Duration('10s'));
  console.debug('JSON response stored in cache for 10 sec');
  callback(null, { field: 'value' });
};
