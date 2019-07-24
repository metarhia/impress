test.endAfterSubtests();

test.test('directory introspection', test => {
  const request = { method: 'GET', path: '/api/' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.assert(data && data.includes('API Introspection index'));
    test.end();
  }));
});

test.test('directory introspection redirected', test => {
  const request = { method: 'GET', path: '/api' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.assertNot(data);
    test.strictSame(res.statusCode, 302);
    test.strictSame(res.headers.location, '/api/');
    test.end();
  }));
});
