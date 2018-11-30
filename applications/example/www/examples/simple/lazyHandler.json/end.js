(client, callback) => {
  console.log('Request finalization handler: end.js');
  callback(null, { handler: 'end' });
}
