test.endAfterSubtests();

const path = '/examples/events/connect.ws';

test.test('websocket connection', test => {
  const { host, port } = api.clientTest.requestOptions;
  const WebSocketClient = api.websocket.client;
  const client = new WebSocketClient();

  client.on('connect', connection => {
    connection.on('error', test.error);
    connection.on('message', message => {
      test.strictSame(message.utf8Data, 'Hello world');
      test.end();
    });
  });
  client.connect(`ws://${host}:${port}${path}`);
});

test.test('websocket fake connection', test => {
  const request = { method: 'GET', path: '/examples/events/connect.ws' };
  api.clientTest.request(request, test.cbFail((res) => {
    test.strictSame(res.statusCode, 400);
    test.end();
  }));
});

test.test('websocket rejected connection', test => {
  const path = '/clientTest/reject.ws';
  const { host, port } = api.clientTest.requestOptions;
  const WebSocketClient = api.websocket.client;
  const client = new WebSocketClient();

  client.on('connect', test.mustNotCall());
  client.on('connectFailed', test.mustCall(() => test.end()));
  client.connect(`ws://${host}:${port}${path}`);
});
