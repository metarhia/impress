(client, callback) => {
  // monkey patching to allow basic authentication
  // for test request with local ip
  client.local = false;
  callback(null, { realm: client.access.realm, auth: client.access.auth });
}
