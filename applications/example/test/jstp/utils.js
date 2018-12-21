api.jstpTest = {
  host: '127.0.0.1',
  port: 5000,
  connect: cb => api.jstp.ws.connectAndInspect(
    'example',
    null,
    ['interfaceName'],
    {},
    `ws://${api.jstpTest.host}:${api.jstpTest.port}`,
    cb
  ),
};
