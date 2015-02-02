var Client = impress.Client;

// Generate HTTP file attachment
//   attachmentName - name to save downloaded file
//   size - set Content-Length header (optional)
//   lastModified - set Last-Modified header (optional)
//
Client.prototype.attachment = function(attachmentName, size, lastModified) {
  var client = this;
  client.res.setHeader('Content-Description', 'File Transfer');
  client.res.setHeader('Content-Type', 'application/x-download');
  client.res.setHeader('Content-Disposition', 'attachment; filename="' + attachmentName + '"');
  client.res.setHeader('Content-Transfer-Encoding', 'binary');
  client.res.setHeader('Expires', 0);
  client.res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
  client.res.setHeader('Pragma', 'no-cache');
  if (size) client.res.setHeader('Content-Length', size);
  if (lastModified) client.res.setHeader('Last-Modified', lastModified);
};

// Download file
//   filePath - file to download
//   attachmentName - name to save downloaded file, optional
//   callback - handler callback
//
Client.prototype.download = function(filePath, attachmentName, callback) {
  var client = this,
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
      var stream = api.fs.createReadStream(filePath);
      stream.on('error', function(error) {
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
//   onFile - callback on processing each file
//     { compressionFlag
//       originalName
//       storageName
//       storagePath
//       originalHash
//       originalSize
//       storageSize }
//   onDone - to be implemented
//
Client.prototype.upload = function(onFile) {
  var client = this,
      application = client.application;

  function saveFile(data, onFile) {
    api.fs.unlink(data.storagePath, function() {
      api.fs.rename(data.storagePath + '.tmp', data.storagePath, function() {
        api.fs.stat(data.storagePath, function(err, stats) {
          data.storageSize = stats.size;
          if (!err && onFile) onFile(data);
        });
      });
    });
  }

  if (client.files) {
    for (var fieldName in client.files) {
      var field = client.files[fieldName];
      for (var i in field) {
        var file = field[i],
            folder1 = api.impress.generateKey(2, impress.DIGIT),
            folder2 = api.impress.generateKey(2, impress.DIGIT),
            code = api.impress.generateKey(8, impress.ALPHA_DIGIT),
            targetDir = application.filesDir + '/' + folder1 + '/' + folder2;
        var data = {
          compressionFlag: 'N',
          originalName: file.originalFilename,
          storageName: folder1 + folder2 + code,
          storagePath: targetDir + '/' + code,
          originalHash: '',
          originalSize: file.size,
          storageSize: file.size
        };
        var tempFile = file.path,
            fileExt = api.path.extname(data.originalName).replace('.', '').toLowerCase(),
            isCompressed = api.impress.inArray(application.extCompressed, fileExt),
            isNotCompressed = api.impress.inArray(application.extNotCompressed, fileExt);
        if (isCompressed || isNotCompressed) {
          if (isNotCompressed) {
            if (data.originalSize >= 1048576) data.compressionFlag = 'Z'; // ZIP
            else data.compressionFlag = 'G'; // GZIP
          }
          api.mkdirp(targetDir, function(err) {
            api.fs.createReadStream(tempFile).pipe(api.fs.createWriteStream(data.storagePath));
            var fd = api.fs.createReadStream(tempFile),
                hash = api.crypto.createHash('md5');
            hash.setEncoding('hex');
            fd.on('end', function() {
              var arc, inp, out;
              hash.end();
              data.originalHash = hash.read();
              if (data.compressionFlag === 'Z') {
                arc = new api.zipstream();
                out = api.fs.createWriteStream(data.storagePath + '.tmp');
                arc.pipe(out);
                arc.on('end', function() { saveFile(data, onFile); });
                arc.entry(api.fs.createReadStream(data.storagePath), { name: data.originalName }, function(err, entry) {
                  if (err) throw err;
                  arc.finalize();
                });
              } else if (data.compressionFlag === 'G') {
                arc = api.zlib.createGzip();
                inp = api.fs.createReadStream(data.storagePath);
                out = api.fs.createWriteStream(data.storagePath + '.tmp');
                inp.pipe(arc).pipe(out);
                inp.on('end', function() { saveFile(data, onFile); });
              } else if (onFile) onFile(data);
            });
            fd.pipe(hash);
          });
        } else console.log('Invalid file type.');
      }
    }
  }

};

// Sending file stream
//
Client.prototype.stream = function(filePath, stats) {
  var client = this,
      application = client.application;

  var stream, range = client.req.headers.range;
  if (range) {
    var start, end;
    var bytes = range.replace(/bytes=/, '').split('-');
    start = parseInt(bytes[0], 10);
    end = bytes[1] ? parseInt(bytes[1], 10) : stats.size - 1;
    var chunksize = (end - start) + 1;
    client.res.statusCode = 206;
    client.res.setHeader('Content-Range', stats.size);
    client.res.setHeader('Content-Length', chunksize);
    client.res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stats.size);
    client.res.setHeader('Accept-Ranges', 'bytes');
    stream = api.fs.createReadStream(filePath, { start: start, end: end });
  } else {
    client.res.setHeader('Content-Length', stats.size);
    client.res.setHeader('Last-Modified', stats.mtime.toGMTString());
    stream = api.fs.createReadStream(filePath);
  }
  stream.on('open', function() {
    stream.pipe(client.res);
  });
  stream.on('error', function(err) {
    application.log.error(impress.CANT_READ_FILE + filePath);
  });
};
