test.endAfterSubtests();

test.test('find nearest handler directory with virtual access', test => {
  const request = {
    method: 'GET',
    path: '/examples/simple/virtualPath.json/a/b/c/',
  };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.strictSame(api.json.parse(data).path, request.path);
    test.end();
  }));
});

test.test('find nearest handler directory, no virtual access', test => {
  const request = {
    method: 'GET',
    path: '/examples/simple/sysInfo.json/a/b/c',
  };

  api.clientTest.request(request, test.cbFail((res) => {
    test.strictSame(res.statusCode, 404);
    test.end();
  }));
});
