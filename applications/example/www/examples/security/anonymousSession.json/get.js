(client, callback) => {
  application.security.startSession(client);
  if (client.session) {
    callback(null, { token: client.session.Token });
  } else {
    callback(null, { token: '' });
  }
}
