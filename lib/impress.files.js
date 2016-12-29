'use strict';

// File upload and download utilities for Impress Application Server
//
const Client = impress.Client;

// Generate HTTP file attachment
//   attachmentName - name to save downloaded file
//   size - set Content-Length header (optional)
//   lastModified - set Last-Modified header (optional)
//
Client.prototype.attachment = function(attachmentName, size, lastModified) {
  let client = this;
  client.res.setHeader('Content-Description', 'File Transfer');
  client.res.setHeader('Content-Type', 'application/x-download');
  let fileName = 'attachment; filename="' + attachmentName + '"';
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

// Download file
//   filePath - file to download
//   attachmentName - name to save downloaded file, optional
//   callback - handler callback
//
Client.prototype.download = function(filePath, attachmentName, callback) {
  let client = this,
      application = client.application;

  if (typeof(attachmentName) === 'function') {
    callback = attachmentName;
    attachmentName = api.path.basename(filePath);
  }
  api.fs.stat(filePath, function(err, stats) {
    if (err) {
      client.error(404);
      callback();
    } else {
      client.attachment(attachmentName, stats.size, stats.mtime.toGMTString());
      let stream = api.fs.createReadStream(filePath);
      stream.on('error', function(/*error*/) {
        application.log.error(impress.CANT_READ_FILE + filePath);
        client.error(404);
        callback();
      });
      stream.pipe(client.res);
    }
  });
};

// Upload file
//
//   onFile - callback on processing each file (optional)
//     { compressionFlag
//       originalName
//       storageName
//       storagePath
//       originalHash
//       originalSize
//       storageSize }
//   onDone(doneCount) - callback on all files processed (optional)
//
Client.prototype.upload = function(onFile, onDone) {
  let client = this;

  let fileCount = 0, doneCount = 0;

  function onFileUploaded(data) {
    doneCount++;
    if (onFile) onFile(data);
    if (fileCount === doneCount && onDone) onDone(doneCount);
  }

  if (client.files) {
    let field, file;
    for (let fieldName in client.files) {
      field = client.files[fieldName];
      for (let i in field) {
        file = field[i];
        fileCount++;
        client.uploadFile(file, onFileUploaded);
      }
    }
  }
};

// Save uploaded file
//   data - structure { compressionFlag, storagePath, storageSize }
//
function saveUploadedFile(data, onFile) {
  if (data.compressionFlag === 'N') onFile(data);
  else {
    api.fs.unlink(data.storagePath, function() {
      api.fs.rename(data.storagePath + '.tmp', data.storagePath, function() {
        api.fs.stat(data.storagePath, function(err, stats) {
          if (!err) data.storageSize = stats.size;
          onFile(data);
        });
      });
    });
  }
}

// Upload file to /files in application base folder
//   file - structure { originalFilename, size, path }
//
Client.prototype.uploadFile = function(file, onFile) {
  let client = this,
      application = client.application;

  let folder1 = api.common.generateKey(2, impress.DIGIT),
      folder2 = api.common.generateKey(2, impress.DIGIT),
      code = api.common.generateKey(8, impress.ALPHA_DIGIT),
      targetDir = application.dir + '/files/' + folder1 + '/' + folder2;
  let data = {
    compressionFlag: 'N',
    originalName: file.originalFilename,
    storageName: folder1 + folder2 + code,
    storagePath: targetDir + '/' + code,
    originalHash: '',
    originalSize: file.size,
    storageSize: file.size
  };
  let tempFile = file.path,
      fileExt = api.common.fileExt(data.originalName),
      isComp = api.common.inArray(application.extCompressed, fileExt),
      isNotComp = api.common.inArray(application.extNotCompressed, fileExt);
  if (isComp || isNotComp) {
    if (isNotComp) {
      if (data.originalSize >= impress.UPLOAD_SIZE_ZIP) {
        // ZIP
        data.compressionFlag = 'Z';
      } else {
        // GZIP
        data.compressionFlag = 'G';
      }
    }
    api.mkdirp(targetDir, function(/*err*/) {
      let ws = api.fs.createWriteStream(data.storagePath);
      let rs = api.fs.createReadStream(tempFile);
      rs.pipe(ws);
      let fd = api.fs.createReadStream(tempFile),
          hash = api.crypto.createHash('md5');
      hash.setEncoding('hex');
      fd.on('end', function() {
        let arc, inp, out;
        hash.end();
        data.originalHash = hash.read();
        if (data.compressionFlag === 'Z') {
          arc = new api.zipStream();  // eslint-disable-line new-cap
          out = api.fs.createWriteStream(data.storagePath + '.tmp');
          arc.pipe(out);
          arc.on('end', function() {
            saveUploadedFile(data, onFile);
          });
          arc.entry(
            api.fs.createReadStream(data.storagePath),
            { name: data.originalName },
            function(err /*entry*/) {
              if (err) throw err;
              arc.finalize();
            }
          );
        } else if (data.compressionFlag === 'G') {
          arc = api.zlib.createGzip();
          inp = api.fs.createReadStream(data.storagePath);
          out = api.fs.createWriteStream(data.storagePath + '.tmp');
          inp.pipe(arc).pipe(out);
          inp.on('end', function() {
            saveUploadedFile(data, onFile);
          });
        } else saveUploadedFile(data, onFile);
      });
      fd.pipe(hash);
    });
  } else application.log.warning('Invalid file type: ' + file.originalFilename);
};

// Sending file stream
//   filePath - absolute path to file
//   stats - instance of fs.Stats
//
Client.prototype.stream = function(filePath, stats) {
  let client = this,
      application = client.application;

  let stream, range = client.req.headers.range;
  if (range) {
    let bytes = range.replace(impress.RANGE_BYTES_REGEXP, '').split('-'),
        start = parseInt(bytes[0], 10),
        end = bytes[1] ? parseInt(bytes[1], 10) : stats.size - 1,
        chunksize = (end - start) + 1;
    client.res.statusCode = 206;
    client.res.setHeader('Content-Range', stats.size);
    client.res.setHeader('Content-Length', chunksize);
    let cRange = 'bytes ' + start + '-' + end + '/' + stats.size;
    client.res.setHeader('Content-Range', cRange);
    client.res.setHeader('Accept-Ranges', 'bytes');
    stream = api.fs.createReadStream(filePath, { start: start, end: end });
  } else {
    let allowOrigin = api.common.getByPath(
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

  stream.on('open', function() {
    stream.pipe(client.res);
  });

  stream.on('error', function(/*err*/) {
    application.log.error(impress.CANT_READ_FILE + filePath);
  });

};
