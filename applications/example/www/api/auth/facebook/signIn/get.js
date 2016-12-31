(client, callback) => {
  client.passportInit(() => {
    client.passport.strategies.facebook.authenticate(
      client.req, client.res, callback
    );
  }, callback);
}
