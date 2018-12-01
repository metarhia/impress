(client, callback) => {
  console.debug(
    'Request finalization handler: end.js, execures after request.js, [verb].js'
  );
  callback(null, { handler: 'end' });
}
