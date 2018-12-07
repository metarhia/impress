(client, callback) => {
  application.security.startSession(client);
  callback(null, { token: client.session.token });
}
