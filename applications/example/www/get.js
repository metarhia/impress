(client, callback) => {
  // Place here logic for HTTP GET method
  if (client.path === '/examples/override/') {
    console.debug('Called client.inherited() from ' + client.path);
  }
  callback();
}
