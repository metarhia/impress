'use strict';

// File upload and download utilities for Impress Application Server

const Client = impress.Client;

Client.prototype.attachment = function(
  // Generate HTTP file attachment
  attachmentName, // name to save downloaded file
  size, // set Content-Length header (optional)
  lastModified // set Last-Modified header (optional)
) {
  const client = this;
  client.res.setHeader('Content-Description', 'File Transfer');
  client.res.setHeader('Content-Type', 'application/x-download');
  const fileName = 'attachment; filename="' + attachmentName + '"';
  client.res.setHeader('Content-Disposition', fileName);
  client.res.setHeader('Expires', 0);
  client.res.setHeader(
    'Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate'
  );
  client.res.setHeader('Pragma', 'no-cache');
  if (size) {
    client.res.setHeader('Content-Length', size);
    client.res.setHeader('Content-Transfer-Encoding', 'binary');
  }
  if (lastModified) client.res.setHeader('Last-Modified', lastModified);
};

Client.prototype.download = function(
  // Download file
  filePath, // file to download
  attachmentName, // name to save downloaded file, optional
  callback // function
) {
  const client = this;
  const application = client.application;

  if (typeof(attachmentName) === 'function') {
    callback = attachmentName;
    attachmentName = api.path.basename(filePath);
  }
  api.fs.stat(filePath, (err, stats) => {
    if (err) {
      client.error(404);
      callback();
    } else {
      client.attachment(attachmentName, stats.size, stats.mtime.toGMTString());
      const stream = api.fs.createReadStream(filePath);
      stream.on('error', (/*error*/) => {
        application.log.error(impress.CANT_READ_FILE + filePath);
        client.error(404);
        callback();
      });
      stream.pipe(client.res);
    }
  });
};

Client.prototype.upload = function(
  // Upload file
  onFile, // optional callback function on processing each file
  // compressionFlag
  // originalName
  // storageName
  // storagePath
  // originalHash
  // originalSize
  // storageSize
  onDone // optional callback function(doneCount)
) {
  const client = this;

  let fileCount = 0, doneCount = 0;

  function onFileUploaded(data) {
    doneCount++;
    if (onFile) onFile(data);
    if (fileCount === doneCount && onDone) onDone(doneCount);
  }

  if (client.files) {
    let fieldName, key, field, file;
    for (fieldName in client.files) {
      field = client.files[fieldName];
      for (key in field) {
        file = field[key];
        fileCount++;
        client.uploadFile(file, onFileUploaded);
      }
    }
  }
};

function saveUploadedFile(
  // Save uploaded file
  data, // { compressionFlag, storagePath, storageSize }
  onFile // function
) {
  if (data.compressionFlag === 'N') onFile(data);
  else {
    api.fs.unlink(data.storagePath, () => {
      api.fs.rename(data.storagePath + '.tmp', data.storagePath, () => {
        api.fs.stat(data.storagePath, (err, stats) => {
          if (!err) data.storageSize = stats.size;
          onFile(data);
        });
      });
    });
  }
}

Client.prototype.uploadFile = function(
  // Upload file to /files in application base folder
  file, // { originalFilename, size, path }
  onFile // function
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
  if (isComp || isNotComp) {
    if (isNotComp) {
      if (data.originalSize >= impress.UPLOAD_SIZE_ZIP) {
        data.compressionFlag = 'Z'; // ZIP
      } else {
        data.compressionFlag = 'G'; // GZIP
      }
    }
    api.mkdirp(targetDir, (/*err*/) => {
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
          arc.on('end', () => saveUploadedFile(data, onFile));
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
          inp.on('end', () => saveUploadedFile(data, onFile));
        } else {
          saveUploadedFile(data, onFile);
        }
      });
      fd.pipe(hash);
    });
  } else {
    application.log.warning('Invalid file type: ' + file.originalFilename);
  }
};

Client.prototype.stream = function(
  // Sending file stream
  filePath, // absolute path to file
  stats // instance of fs.Stats
) {
  const client = this;
  const application = client.application;

  let stream;
  const range = client.req.headers.range;
  if (range) {
    const bytes = range.replace(impress.RANGE_BYTES_REGEXP, '').split('-');
    const start = parseInt(bytes[0], 10);
    const end = bytes[1] ? parseInt(bytes[1], 10) : stats.size - 1;
    const chunkSize = (end - start) + 1;
    client.res.statusCode = 206;
    client.res.setHeader('Content-Range', stats.size);
    client.res.setHeader('Content-Length', chunkSize);
    const cRange = 'bytes ' + start + '-' + end + '/' + stats.size;
    client.res.setHeader('Content-Range', cRange);
    client.res.setHeader('Accept-Ranges', 'bytes');
    stream = api.fs.createReadStream(filePath, { start, end });
  } else {
    const allowOrigin = api.common.getByPath(
      application.config,
      'application.allowOrigin'
    );
    if (allowOrigin) {
      client.res.setHeader(
        'Access-Control-Allow-Origin',
        allowOrigin
      );
      client.res.setHeader(
        'Access-Control-Allow-Headers',
        'origin, content-type, accept'
      );
    }
    client.res.setHeader('Content-Length', stats.size);
    client.res.setHeader('Last-Modified', stats.mtime.toGMTString());
    stream = api.fs.createReadStream(filePath);
  }

  stream.on('open', () => stream.pipe(client.res));

  stream.on('error', (/*err*/) => {
    application.log.error(impress.CANT_READ_FILE + filePath);
  });

};
