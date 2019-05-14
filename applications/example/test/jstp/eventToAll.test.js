test.endAfterSubtests();

const waitEvent = (test, connection, interfaceName, expectedEventData) => {
  test.test('wait event', t => {
    connection.on('event', (iface, ...eventData) => {
      if (iface === interfaceName) {
        t.strictSame(eventData, expectedEventData);
        t.end();
      }
    });
  });
};

test.test('broadcastToClients JSTP', test => {
  const interfaceName = 'eventToAllInterfaceJSTP';
  const data = { example: 'hello' };
  const eventData = ['eventName', [data]];
  api.jstpTest.connect(test.cbFail(c1 => {
    waitEvent(test, c1, interfaceName, eventData);

    api.jstpTest.connect(test.cbFail((c2, app) => {
      waitEvent(test, c2, interfaceName, eventData);

      test.test('call method', t => {
        app.interfaceName.sendEventToAll(t.cb(() => t.end()));
      });

      test.on('done', () => {
        c1.close();
        c2.close();
      });

      test.endAfterSubtests();
    }), api.jstpTest.ports[1]);
  }), api.jstpTest.ports[0]);
}, { parallelSubtests: true });

test.test('broadcastToClients HTTP', test => {
  const interfaceName = 'eventToAllInterfaceHTTP';
  const data = { example: 'hello' };
  const eventData = ['eventName', [data]];
  api.jstpTest.connect(test.cbFail(c1 => {
    waitEvent(test, c1, interfaceName, eventData);

    api.jstpTest.connect(test.cbFail((c2, app) => {
      waitEvent(test, c2, interfaceName, eventData);

      test.test('call method', t => {
        const request = {
          agent: false,
          host: '127.0.0.1',
          port: 8080,
          method: 'GET',
          path: '/examples/tools/appBroadcastToClients.json',
        };
        const req = api.http.request(request);
        req.on('response', res => {
          t.strictSame(res.statusCode, 200);
          t.end();
        });
        req.on('error', err => {
          t.fail(err);
          t.end();
        });
        req.end();
      });

      test.on('done', () => {
        c1.close();
        c2.close();
      });

      test.endAfterSubtests();
    }), api.jstpTest.ports[1]);
  }), api.jstpTest.ports[0]);
}, { parallelSubtests: true });
