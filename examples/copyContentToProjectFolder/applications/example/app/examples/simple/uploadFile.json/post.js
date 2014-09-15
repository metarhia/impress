module.exports = function(client, callback) {

  callback(client.files);

  function saveToDatabase() {
    api.fs.stat(storageFile, function() {
      //query(
      //  'insert into StorageFile (OwnerId, StorageSize, OriginalSize, StorageName, CompressionFlag, OriginalExt, OriginalHash, OriginalName) values(?,?,?,?,?,?,?,?)',
      //  1, storageSize, originalSize, storageName, compressionFlag, fileExt, originalHash, originalName
      //);
    });
  }

  if (client.files) {
    var storagePath = application.dir+'/files';
    for (var fieldName in client.files) {
      var field = client.files[fieldName];
      for (var i in field) {
        var file = field[i],
          tempFile = file.path,
          originalName = file.originalFilename,
          originalSize = file.size,
          compressionFlag = 'N',
          fileExt = api.path.extname(originalName).replace('.','').toLowerCase(),
          folder1 = generateKey(2, '0123456789'),
          folder2 = generateKey(2, '0123456789'),
          code = generateKey(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'),
          storageName = folder1+folder2+code,
          targetDir = storagePath+'/'+folder1+'/'+folder2,
          storageFile = targetDir+'/'+code,
          isCompressed = inArray(extCompressed, fileExt),
          isNotCompressed = inArray(extNotCompressed, fileExt);
        if (isCompressed || isNotCompressed) {
          if (isNotCompressed) {
            if (originalSize>=1048576) compressionFlag = 'Z'; // ZIP
            else compressionFlag = 'G';                       // GZIP
          }
          api.mkdirp(targetDir, function(err) {
            api.fs.createReadStream(tempFile).pipe(api.fs.createWriteStream(storageFile));
            var fd = api.fs.createReadStream(tempFile),
              hash = api.crypto.createHash('md5');
            hash.setEncoding('hex');
            fd.on('end', function() {
              hash.end();
              var originalHash = hash.read();
              if (compressionFlag == 'Z') {
                var zipFile = storageFile+'.zip',
                  archive = new api.zipstream(),
                  out = api.fs.createWriteStream(zipFile),
                  inp = api.fs.createReadStream(storageFile);
                archive.pipe(out);
                archive.on('end', function() {
                  api.fs.unlink(storageFile, function() {
                    api.fs.rename(zipFile, storageFile, function() {});
                  });
                });
                archive.entry(api.fs.createReadStream(storageFile), { name: originalName }, function(err, entry) {
                  if (err) throw err;
                  archive.finalize();
                });
              } else if (compressionFlag == 'G') {
                var zipFile = storageFile+'.gz',
                  gzip = api.zlib.createGzip(),
                  inp = api.fs.createReadStream(storageFile),
                  out = api.fs.createWriteStream(zipFile);
                inp.pipe(gzip).pipe(out);
                inp.on('end', function() {
                  api.fs.unlink(storageFile, function() {
                    api.fs.rename(zipFile, storageFile, function() {});
                  });
                });
              }
            });
            fd.pipe(hash);
          });
        } else {
          console.log('Invalid file type.');
        }
      }
    }
  }

}