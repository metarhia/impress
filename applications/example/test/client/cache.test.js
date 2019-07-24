test.endAfterSubtests();

test.test('client.cache', test => {
  const request = { method: 'GET', path: '/clientTest/cache.json' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const { clientStartTime } = api.json.parse(data);
    api.clientTest.request(request, test.cbFail((res, data) => {
      test.strictSame(res.statusCode, 200);
      const cache = api.json.parse(data);
      test.strictSame(cache.clientStartTime, clientStartTime);
      test.end();
    }));
  }));
});
