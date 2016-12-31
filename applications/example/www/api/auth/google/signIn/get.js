(client, callback) => {
  client.passportInit(() => {
    client.passport.strategies.google.authenticate(
      client.req, client.res, callback
    );
  }, callback);
}
