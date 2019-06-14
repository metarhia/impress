api.jstpTest = {
  host: '127.0.0.1',
  ports: [5000, 5001],
  connect: (cb, port = api.jstpTest.ports[0]) => api.jstp.ws.connectAndInspect(
    'test',
    null,
    ['interfaceName'],
    {},
    `ws://${api.jstpTest.host}:${port}`,
    cb
  ),
};
