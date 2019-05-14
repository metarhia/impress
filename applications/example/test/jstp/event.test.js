test.endAfterSubtests();
test.test('interfaceName.sendEvent integration test', test => {
  api.jstpTest.connect((err, connection, app) => {
    test.error(err);
    test.assert(connection);
    test.assert(app);

    connection.once('event', (interfaceName, remoteName, remoteArgs) => {
      test.strictSame(interfaceName, 'interfaceName');
      test.strictSame(remoteName, 'eventName');
      test.strictSame(remoteArgs, [ { example: 'hello' } ]);
      test.end();
    });

    app.interfaceName.sendEvent(err => {
      test.error(err);
    });
  });
});
