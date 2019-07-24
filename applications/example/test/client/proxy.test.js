test.endAfterSubtests();

test.test('client.proxy', test => {
  const request = { method: 'GET', path: '/clientTest/client.proxy.json' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.strictSame(data, '"Called client.proxy()"');
    test.end();
  }));
});
