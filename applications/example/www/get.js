(client, callback) => {
  // Place here logic for HTTP GET method
  if (client.path === '/examples/override/') {
    console.log('Called client.inherited() from ' + client.path);
  }
  callback();
}
