test.endAfterSubtests();

test.test('client.upload', test => {
  const testStartMs = Date.now();
  const form = {
    options: { path: '/examples/simple/uploadFile.json', boundary: 'boundary' },
    files: {
      image: ['test/client/files/example.png'],
      file: ['test/client/files/simple.txt'],
    },
  };

  const checkFiles = files =>
    Object.values(files).every(values =>
      values.every(({ fieldName, originalFilename }) =>
        form.files[fieldName] &&
        form.files[fieldName].some(path =>
          api.path.basename(path) === originalFilename
        )
      )
    );

  const deleteUploadedFiles = cb => {
    const cwd = api.process.cwd();
    const applicationDir = api.path.join(cwd, 'applications/example');
    const filesDir = '../../files';

    api.fs.readdir(filesDir, (err, files) => {
      if (err) {
        cb(err);
        return;
      }

      const deleteFile = (file, cb) => {
        const path = api.path.join('files', file);
        api.fs.stat(path, (err, stat) => {
          if (err || stat.birthtimeMs < testStartMs) {
            cb(err);
          } else {
            const absolutePath = api.path.join(applicationDir, path);
            api.common.rmRecursive(absolutePath, cb);
          }
        });
      };

      api.metasync.each(files, deleteFile, cb);
    });
  };

  api.clientTest.sendFormData(form, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const { files, count } = api.json.parse(data);
    test.assert(checkFiles(files));
    test.strictSame(count, 2);
    deleteUploadedFiles(test.cbFail(() => test.end()));
  }));
});

// commented due to https://github.com/metarhia/impress/issues/1190
//
// test.test('client.upload, no files in form', test => {
//   const form = {
//     fields: { parameter: ['value'] },
//     options: { path: '/examples/simple/uploadFile.json', boundary: 'boundary' },
//   };
//
//   api.clientTest.sendFormData(form, test.cbFail((res, data) => {
//     test.strictSame(res.statusCode, 200);
//     const { files, count } = api.json.parse(data);
//     test.strictSame(count, 0);
//     test.strictSame(files, {});
//     test.end();
//   }));
// });

test.test('client.upload, not multiparty/form-data', test => {
  const request = { method: 'POST', path: '/examples/simple/uploadFile.json' };
  api.clientTest.request(request, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const { files, count } = api.json.parse(data);
    test.strictSame(count, 0);
    test.assertNot(files);
    test.end();
  }));
});
