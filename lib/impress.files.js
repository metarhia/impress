'use strict';

// File upload and download utilities for Impress Application Server

const Client = impress.Client;

Client.prototype.attachment = function(
  // Generate HTTP file attachment
  attachmentName, // name to save downloaded file
  size, // set Content-Length header (optional)
  lastModified // set Last-Modified header (optional)
) {
  const res = this.res;

  res.setHeader('Content-Description', 'File Transfer');
  res.setHeader('Content-Type', 'application/x-download');
  const fileName = 'attachment; filename="' + attachmentName + '"';
  res.setHeader('Content-Disposition', fileName);
  res.setHeader('Expires', 0);
  const cacheControl = 'no-cache, no-store, max-age=0, must-revalidate';
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Pragma', 'no-cache');
  if (size) {
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Transfer-Encoding', 'binary');
  }
  if (lastModified) res.setHeader('Last-Modified', lastModified);
};

Client.prototype.download = function(
  // Download file
  filePath, // file to download
  attachmentName, // name to save downloaded file, optional
  done // optional function
) {
  const client = this;
  const application = client.application;

  if (typeof(attachmentName) === 'function') {
    done = attachmentName;
    attachmentName = api.path.basename(filePath);
  }
  done = api.metasync.cb(done);

  const fail = () => {
    application.log.error(impress.CANT_READ_FILE + filePath);
    client.error(404);
    done();
  };

  api.fs.stat(filePath, (err, stats) => {
    if (err) return fail();
    client.attachment(attachmentName, stats.size, stats.mtime.toGMTString());
    const stream = api.fs.createReadStream(filePath);
    stream.on('error', fail);
    client.res.on('finish', done);
    stream.pipe(client.res);
  });
};

Client.prototype.upload = function(
  // Upload file
  each, // optional callback(err, data) on processing each file
  //  data: { compressionFlag, originalName, storageName
  //  storagePath, originalHash, originalSize, storageSize }
  done // optional callback function(err, doneCount)
) {
  const client = this;
  done = api.metasync.cb(done);
  if (!client.files) return done(null, 0);

  let fileCount = 0;
  let doneCount = 0;

  const cb = (err, data) => {
    doneCount++;
    if (each) each(err, data);
    if (fileCount === doneCount) done(null, doneCount);
  };

  let fieldName, key, field, file;
  for (fieldName in client.files) {
    field = client.files[fieldName];
    for (key in field) {
      file = field[key];
      fileCount++;
      client.uploadFile(file, cb);
    }
  }
};

function saveUploadedFile(
  // Save uploaded file
  data, // { compressionFlag, storagePath, storageSize }
  done // function(error, data)
) {
  if (data.compressionFlag === 'N') return done(null, data);
  api.fs.unlink(data.storagePath, () => {
    api.fs.rename(data.storagePath + '.tmp', data.storagePath, () => {
      api.fs.stat(data.storagePath, (err, stats) => {
        if (!err) data.storageSize = stats.size;
        done(err, data);
      });
    });
  });
}

Client.prototype.uploadFile = function(
  // Upload file to /files in application base folder
  file, // { originalFilename, size, path }
  done // function(err, data)
) {
  const client = this;
  const application = client.application;

  const folder1 = api.common.generateKey(2, impress.DIGIT);
  const folder2 = api.common.generateKey(2, impress.DIGIT);
  const code = api.common.generateKey(8, impress.ALPHA_DIGIT);
  const targetDir = application.dir + '/files/' + folder1 + '/' + folder2;
  const data = {
    compressionFlag: 'N',
    originalName: file.originalFilename,
    storageName: folder1 + folder2 + code,
    storagePath: targetDir + '/' + code,
    originalHash: '',
    originalSize: file.size,
    storageSize: file.size
  };
  const tempFile = file.path;
  const fileExt = api.common.fileExt(data.originalName);
  const isComp = application.extCompressed.includes(fileExt);
  const isNotComp = application.extNotCompressed.includes(fileExt);
  if (!isComp && !isNotComp) {
    application.log.warning('Invalid file type: ' + file.originalFilename);
    return;
  }
  if (isNotComp) {
    data.compressionFlag = ( // ZIP : GZIP
      data.originalSize >= impress.UPLOAD_SIZE_ZIP ? 'Z' : 'G'
    );
  }
  api.mkdirp(targetDir, () => {
    const ws = api.fs.createWriteStream(data.storagePath);
    const rs = api.fs.createReadStream(tempFile);
    rs.pipe(ws);
    const fd = api.fs.createReadStream(tempFile);
    const hash = api.crypto.createHash('md5');
    hash.setEncoding('hex');
    fd.on('end', () => {
      let arc, inp, out;
      hash.end();
      data.originalHash = hash.read();
      if (data.compressionFlag === 'Z') {
        arc = new api.zipStream(); // eslint-disable-line new-cap
        out = api.fs.createWriteStream(data.storagePath + '.tmp');
        arc.pipe(out);
        arc.on('end', () => saveUploadedFile(data, done));
        arc.entry(
          api.fs.createReadStream(data.storagePath),
          { name: data.originalName },
          (err /*entry*/) => {
            if (err) throw err;
            arc.finalize();
          }
        );
      } else if (data.compressionFlag === 'G') {
        arc = api.zlib.createGzip();
        inp = api.fs.createReadStream(data.storagePath);
        out = api.fs.createWriteStream(data.storagePath + '.tmp');
        inp.pipe(arc).pipe(out);
        inp.on('end', () => saveUploadedFile(data, done));
      } else {
        saveUploadedFile(data, done);
      }
    });
    fd.pipe(hash);
  });
};

Client.prototype.stream = function(
  // Sending file stream
  filePath, // absolute path to file
  stats // instance of fs.Stats
) {
  const client = this;
  const application = client.application;
  const res = client.res;

  let stream;
  const range = client.req.headers.range;
  if (range) {
    const bytes = range.replace(impress.RANGE_BYTES_REGEXP, '').split('-');
    const start = parseInt(bytes[0], 10);
    const end = bytes[1] ? parseInt(bytes[1], 10) : stats.size - 1;
    const chunkSize = (end - start) + 1;
    res.statusCode = 206;
    res.setHeader('Content-Range', stats.size);
    res.setHeader('Content-Length', chunkSize);
    const cRange = 'bytes ' + start + '-' + end + '/' + stats.size;
    res.setHeader('Content-Range', cRange);
    res.setHeader('Accept-Ranges', 'bytes');
    stream = api.fs.createReadStream(filePath, { start, end });
  } else {
    const allowOrigin = api.common.getByPath(
      application.config, 'application.allowOrigin'
    );
    if (allowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      const headers = 'origin, content-type, accept';
      res.setHeader('Access-Control-Allow-Headers', headers);
    }
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Last-Modified', stats.mtime.toGMTString());
    stream = api.fs.createReadStream(filePath);
  }

  stream.on('open', () => stream.pipe(client.res));

  stream.on('error', () => {
    application.log.error(impress.CANT_READ_FILE + filePath);
  });
};
