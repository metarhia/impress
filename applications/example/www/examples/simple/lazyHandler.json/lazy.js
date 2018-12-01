(client, callback) => {
  console.debug(
    'Lazy handler: lazy.js, executes after all others and connection closed'
  );
  callback(null, { handler: 'lazy' });
}
