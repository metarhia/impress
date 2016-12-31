(client, callback) => {
  client.passportInit(() => {
    client.passport.strategies.twitter.authenticateCallback(
      client.req, client.res, callback
    );
  }, callback);
}
