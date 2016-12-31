(client, callback) => {
  client.passportInit(() => {
    client.passport.strategies.facebook.authenticateCallback(
      client.req, client.res, callback
    );
  }, callback);
}
