api.clientTest = {
  requestOptions: {
    port: 8080,
    host: '127.0.0.1',
    agent: false,
  },
};

api.clientTest.request = (request, data, cb) => {
  if (!cb) {
    cb = data;
    data = '';
  }

  request = { ...request, ...api.clientTest.requestOptions };
  const req = api.http.request(request);

  req.on('response', res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (res.headers['content-encoding'] === 'gzip') {
        api.zlib.unzip(buf, (err, data) => {
          err ? cb(err) : cb(null, res, data.toString());
        });
      } else {
        cb(null, res, buf.toString());
      }
    });
  });
  req.on('error', cb);
  req.end(data);
};

api.clientTest.sendFormData = (form, cb) => {
  const { options, fields = {}, files = {} } = form;

  const CRLF = '\r\n';
  const boundary = `--${options.boundary}`;
  const disposition = `${boundary}${CRLF}Content-Disposition: form-data;`;
  const contentType = `multipart/form-data; boundary=${options.boundary}`;
  const request = {
    method: 'POST',
    path: options.path,
    headers: { 'Content-Type': contentType },
  };

  const processField = ([name, values]) =>
    values
      .map(v => `${disposition} name="${name}"${CRLF}${CRLF}${v}${CRLF}`)
      .join('');

  const processFields = () => {
    const processedFields = Object.entries(fields).map(processField).join('');
    return Buffer.from(processedFields);
  };

  const processFile = (name, path, cb) => {
    const filename = api.path.basename(path);
    const headers = `${disposition} name="${name}"; filename="${filename}"` +
      `${CRLF}Content-Type: application/octet-stream${CRLF}${CRLF}`;

    api.fs.readFile(path, (err, data) => {
      if (err) {
        cb(err);
        return;
      }
      const buffer = Buffer.concat([
        Buffer.from(headers), data, Buffer.from(CRLF)
      ]);
      cb(null, buffer);
    });
  };

  const processFiles = ([name, paths], cb) => {
    api.metasync.map(
      paths,
      (path, cb) => processFile(name, path, cb),
      (err, processedFiles) => {
        if (err) {
          cb(err);
        } else {
          cb(null, Buffer.concat(processedFiles))
        }
      }
    );
  };

  api.metasync.map(
    Object.entries(files),
    processFiles,
    (err, processedFiles) => {
      if (err) {
        cb(err);
        return;
      }

      const processedFields = processFields();
      const bodyEnd = Buffer.from(`${boundary}--`);
      const body = Buffer.concat(
        [processedFields, ...processedFiles, bodyEnd]
      );

      api.clientTest.request(request, body, cb);
    }
  );
};
