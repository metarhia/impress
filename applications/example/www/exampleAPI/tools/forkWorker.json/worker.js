(client, callback) => {
  console.debug('Message from forked worker');
  console.debug(Object.keys(client));
  callback();
}
