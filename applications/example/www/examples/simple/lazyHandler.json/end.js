(client, callback) => {
  console.debug('Request finalization handler: end.js');
  callback(null, { handler: 'end' });
}
