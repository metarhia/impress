test.endAfterSubtests();

test.test('client.download', test => {
  const request = { method: 'GET', path: '/examples/simple/download.ajax' };

  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    test.assert(data);

    const { headers } = res;
    const attachmentName = 'example.png';
    const cacheControl = 'no-cache, no-store, max-age=0, must-revalidate';
    const fileName = `attachment; filename="${attachmentName}"`;
    const filePath = api.path.join('../../www', request.path, attachmentName);

    test.strictSame(headers['content-description'], 'File Transfer');
    test.strictSame(headers['content-type'], 'application/x-download');
    test.strictSame(headers['content-disposition'], fileName);
    test.strictSame(headers['cache-control'], cacheControl);
    test.strictSame(headers.pragma, 'no-cache');
    test.strictSame(headers.expires, '0');

    api.fs.stat(filePath, test.cbFail(stats => {
      test.same(res.headers['content-length'], stats.size);
      test.strictSame(res.headers['last-modified'], stats.mtime.toUTCString());
      test.strictSame(res.headers['content-transfer-encoding'], 'binary');
      test.end();
    }));
  }));
});
