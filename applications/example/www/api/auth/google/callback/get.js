(client, callback) => {
  client.passportInit(() => {
    client.passport.strategies.google.authenticateCallback(
      client.req, client.res, callback
    );
  }, callback);
}
