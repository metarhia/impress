'use strict';

// File upload and download utilities for Impress Application Server

const UPLOAD_SIZE_ZIP = 1048576;

const Client = impress.Client;

// Generate HTTP file attachment
//   attachmentName <string> name to save downloaded file
//   size <number> set Content-Length header (optional)
//   lastModified <string> set Last-Modified header (optional)
Client.prototype.attachment = function(attachmentName, size, lastModified) {
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

// Download file
//   filePath <string> file to download
//   attachmentName <string> name to save downloaded file, optional
//   done <Function>
Client.prototype.download = function(filePath, attachmentName, done) {
  if (typeof attachmentName === 'function') {
    done = attachmentName;
    attachmentName = api.path.basename(filePath);
  }
  done = api.common.once(done);

  const fail = () => {
    impress.log.error(impress.CANT_READ_FILE + filePath);
    this.error(404);
    done();
  };

  api.fs.stat(filePath, (err, stats) => {
    if (err) {
      fail();
      return;
    }
    this.attachment(attachmentName, stats.size, stats.mtime.toGMTString());
    const stream = api.fs.createReadStream(filePath);
    stream.on('error', fail);
    this.res.on('finish', done);
    stream.pipe(this.res);
  });
};

// Upload file
//   each, <Function>(err, data) on processing each file
//     data
//       compressionFlag, originalName, storageName
//       storagePath, originalHash, originalSize, storageSize
//   done <Function>(err, doneCount)
Client.prototype.upload = function(each, done) {
  done = api.common.once(done);
  if (!this.files) {
    done(null, 0);
    return;
  }

  let fileCount = 0;
  let doneCount = 0;

  const cb = (err, data) => {
    doneCount++;
    if (each) each(err, data);
    if (fileCount === doneCount) done(null, doneCount);
  };

  for (const fieldName in this.files) {
    const field = this.files[fieldName];
    for (const key in field) {
      const file = field[key];
      fileCount++;
      this.uploadFile(file, cb);
    }
  }
};

// Save uploaded file
//   data <Object> { compressionFlag, storagePath, storageSize }
//   done <Function>(error, data)
const saveUploadedFile = (data, done) => {
  if (data.compressionFlag === 'N') {
    done(null, data);
    return;
  }
  api.fs.unlink(data.storagePath, () => {
    api.fs.rename(data.storagePath + '.tmp', data.storagePath, () => {
      api.fs.stat(data.storagePath, (err, stats) => {
        if (!err) data.storageSize = stats.size;
        done(err, data);
      });
    });
  });
};

// Upload file to /files in application base folder
//   file <Object> { originalFilename, size, path }
//   done <Function>(err, data)
Client.prototype.uploadFile = function(file, done) {
  const application = this.application;

  const folder1 = api.common.generateKey(2, api.common.DIGIT);
  const folder2 = api.common.generateKey(2, api.common.DIGIT);
  const code = api.common.generateKey(8, api.common.ALPHA_DIGIT);
  const targetDir = application.dir + '/files/' + folder1 + '/' + folder2;
  const data = {
    compressionFlag: 'N',
    originalName: file.originalFilename,
    storageName: folder1 + folder2 + code,
    storagePath: targetDir + '/' + code,
    originalHash: '',
    originalSize: file.size,
    storageSize: file.size,
  };
  const tempFile = file.path;
  const fileExt = api.common.fileExt(data.originalName);
  const isComp = application.extCompressed.includes(fileExt);
  const isNotComp = application.extNotCompressed.includes(fileExt);
  if (!isComp && !isNotComp) {
    impress.log.warn('Invalid file type: ' + file.originalFilename);
    return;
  }
  if (isNotComp) {
    data.compressionFlag = ( // ZIP : GZIP
      data.originalSize >= UPLOAD_SIZE_ZIP ? 'Z' : 'G'
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
        arc.on('end', () => {
          saveUploadedFile(data, done);
        });
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
        inp.on('end', () => {
          saveUploadedFile(data, done);
        });
      } else {
        saveUploadedFile(data, done);
      }
    });
    fd.pipe(hash);
  });
};

// Sending file stream
//   filePath <string> absolute path to file
//   stats <Stats> instance of fs.Stats
Client.prototype.stream = function(filePath, stats) {
  const application = this.application;
  const res = this.res;

  let stream;
  const range = this.req.headers.range;
  if (range) {
    const bytes = range.replace(/bytes=/, '').split('-');
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

  stream.on('open', () => {
    stream.pipe(this.res);
  });

  stream.on('error', () => {
    impress.log.error(impress.CANT_READ_FILE + filePath);
  });
};
