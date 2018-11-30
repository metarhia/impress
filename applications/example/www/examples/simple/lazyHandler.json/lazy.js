(client, callback) => {
  console.log(
    'Lazy handler: lazy.js, executes after all others and connection closed'
  );
  callback(null, { handler: 'lazy' });
}
