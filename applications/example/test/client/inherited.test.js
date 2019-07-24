test.endAfterSubtests();

test.test('client.inherited', test => {
  const request = {
    method: 'GET',
    path: '/clientTest/inherited/client.inherited.json',
  };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.strictSame(data, `"Called client.inherited() from ${request.path}"`);
    test.end();
  }));
});
