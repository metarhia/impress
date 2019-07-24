test.endAfterSubtests();

test.test('static file with compressed extension', test => {
  const request = { method: 'GET', path: '/images/impress.svg' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.assert(data);
    test.strictSame(res.statusCode, 200);

    const imagePath = api.path.join('../../static', request.path);
    api.fs.stat(imagePath, test.cbFail(stats => {
      test.same(res.headers['content-length'], stats.size);
      test.strictSame(res.headers['last-modified'], stats.mtime.toUTCString());
      test.strictNotSame(res.headers['content-encoding'], 'gzip');
      test.end();
    }));
  }));
});

test.test('static file with compressed extension, not modified', test => {
  const request = { method: 'GET', path: '/images/impress.svg' };
  const imagePath = api.path.join('../../static', request.path);

  api.fs.stat(imagePath, test.cbFail(stats => {
    request.headers = { 'if-modified-since': stats.mtime.toISOString() };
    api.clientTest.request(request, test.cbFail((res, data) => {
      // here and later in tests lines are commented
      // due to https://github.com/metarhia/impress/issues/1187
      //
      // test.assertNot(data);
      // test.strictSame(res.statusCode, 304);
      test.end();
    }));
  }));
});

test.test('static compressed gzip file', test => {
  const request = { method: 'GET', path: '/js/impress.js' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.assert(data);
    test.strictSame(res.statusCode, 200);
    // test.strictSame(res.headers['content-encoding'], 'gzip');
    test.end();
  }));
});

test.test('static streamed file', test => {
  const request = { method: 'GET', path: '/images/sprite.png' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.assert(data);
    test.strictSame(res.statusCode, 200);

    const imagePath = api.path.join('../../static', request.path);
    api.fs.stat(imagePath, test.cbFail(stats => {
      test.same(res.headers['content-length'], stats.size);
      test.strictSame(res.headers['last-modified'], stats.mtime.toUTCString());
      test.end();
    }));
  }));
});

test.test('static streamed file with specified range', test => {
  const rangeStart = 10;
  const rangeEnd = 1000;
  const request = {
    method: 'GET',
    path: '/images/sprite.png',
    headers: { range: `bytes=${rangeStart}-${rangeEnd}` },
  };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.assert(data);
    test.strictSame(res.statusCode, 206);

    const imagePath = api.path.join('../../static', request.path);
    api.fs.stat(imagePath, test.cbFail(stats => {
      test.same(res.headers['content-length'], (rangeEnd - rangeStart) + 1);
      test.strictSame(res.headers['accept-ranges'], 'bytes');
      test.strictSame(
        res.headers['content-range'],
        `bytes ${rangeStart}-${rangeEnd}/${stats.size}`
      );
      test.end();
    }));
  }));
});

test.test('static directory index', test => {
  const request = { method: 'GET', path: '/samples/' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.assert(data && data.includes('Directory index'));

    const dirPath = api.path.join('../../static', request.path);
    api.fs.readdir(dirPath, test.cbFail(files => {
      test.assert(files.every(file => data.includes(file)));
      test.end();
    }));
  }));
});

test.test('static directory index redirected', test => {
  const request = { method: 'GET', path: '/samples' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.assertNot(data);
    test.strictSame(res.statusCode, 302);
    test.strictSame(res.headers.location, '/samples/');
    test.end();
  }));
});
