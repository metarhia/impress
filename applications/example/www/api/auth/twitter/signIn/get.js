(client, callback) => {
  client.passportInit(() => {
    client.passport.strategies.twitter.authenticate(
      client.req, client.res, callback
    );
  }, callback);
}
