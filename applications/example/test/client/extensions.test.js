test.endAfterSubtests();

test.test('html, handler result is a string', test => {
  const request = {
    method: 'GET',
    path: '/clientTest/stringHandlerResult.ajax',
  };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.strictSame(data, request.path);
    test.end();
  }));
});

test.test('html, processing page', test => {
  const request = { method: 'GET', path: '/examples/simple/ajaxTest.ajax' };
  const path = api.path.join('../../www', request.path, 'html.template');

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    api.fs.readFile(path, 'utf8', test.cbFail(template => {
      test.strictSame(data, template);
      test.end();
    }));
  }));
});

test.test('html, no template page to process', test => {
  const request = { method: 'GET', path: '/examples/news/randomList.ajax' };
  api.clientTest.request(request, test.cbFail(res => {
    test.strictSame(res.statusCode, 500);
    test.end();
  }));
});

test.test('json, handler result exists', test => {
  const request = {
    method: 'GET',
    path: '/examples/simple/getApiNamespaces.json',
  };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const result = api.json.parse(data).sort();
    const expectedResult = Object.keys(api).sort();
    test.strictSame(result, expectedResult);
    test.end();
  }));
});

test.test('json, no handler result to send', test => {
  const request = { method: 'GET', path: '/clientTest/noHandlerResult.json' };
  api.clientTest.request(request, test.cbFail(res => {
    test.strictSame(res.statusCode, 400);
    test.end();
  }));
});

test.test('csv, handler result exists', test => {
  const expectedResult = [
    ['name1', 11, 21.1],
    ['name2', 12, 22.2],
    ['name3', 13, 23.3],
    ['name4', 14, 24.4],
    ['name5', 15, 25.5],
  ];
  const request = {
    method: 'GET',
    path: '/examples/simple/csvStringify.csv',
  };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    api.csvStringify(expectedResult, test.cbFail(csvExpectedResult => {
      test.strictSame(data, csvExpectedResult);
      test.end();
    }));
  }));
});

test.test('csv, no handler result to send', test => {
  const request = { method: 'GET', path: '/clientTest/noHandlerResult.csv' };
  api.clientTest.request(request, test.cbFail(res => {
    test.strictSame(res.statusCode, 400);
    test.end();
  }));
});
