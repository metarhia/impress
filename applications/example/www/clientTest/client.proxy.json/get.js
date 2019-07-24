client => {
  const { host, port } = api.clientTest.requestOptions;
  const path = '/clientTest/proxy.json';
  client.proxy(host, port, path);
}
