(client, callback) => {
  console.log(
    'Request finalization handler: end.js, execures after request.js, [verb].js'
  );
  callback({ handler: 'end' });
}
