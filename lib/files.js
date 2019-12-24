'use strict';

const UPLOAD_SIZE_ZIP = 1048576;

// Save uploaded file
//   data <Object> { compressionFlag, storagePath, storageSize }
//   callback <Function>
//     error <Error>
//     data <Object>
const saveUploadedFile = (data, callback) => {
  if (data.compressionFlag === 'N') {
    callback(null, data);
    return;
  }
  api.fs.unlink(data.storagePath, () => {
    api.fs.rename(data.storagePath + '.tmp', data.storagePath, () => {
      api.fs.stat(data.storagePath, (err, stats) => {
        if (!err) data.storageSize = stats.size;
        callback(err, data);
      });
    });
  });
};

// Upload file to /files in application base folder
//   file <Object> { originalFilename, size, path }
//   callback <Function>
//     err <Error>
//     data <Object>
const uploadFile = (application, file, callback) => {
  const folder1 = api.common.generateKey(2, api.common.DIGIT);
  const folder2 = api.common.generateKey(2, api.common.DIGIT);
  const code = api.common.generateKey(8, api.common.ALPHA_DIGIT);
  const targetDir = api.path.join(application.dir, 'files', folder1, folder2);
  const data = {
    compressionFlag: 'N',
    originalName: file.originalFilename,
    storageName: folder1 + folder2 + code,
    storagePath: api.path.join(targetDir, code),
    originalHash: '',
    originalSize: file.size,
    storageSize: file.size,
  };
  const tempFile = file.path;
  const fileExt = api.common.fileExt(data.originalName);
  const isComp = impress.COMPRESSED_EXT.includes(fileExt);
  const isNotComp = impress.NOT_COMPRESSED_EXT.includes(fileExt);
  if (!isComp && !isNotComp) {
    const msg = 'Invalid file type: ' + file.originalFilename;
    application.log.warn(msg);
    callback(new Error(msg));
    return;
  }
  if (isNotComp) {
    // ZIP : GZIP
    data.compressionFlag = data.originalSize >= UPLOAD_SIZE_ZIP ? 'Z' : 'G';
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
          saveUploadedFile(data, callback);
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
          saveUploadedFile(data, callback);
        });
      } else {
        saveUploadedFile(data, callback);
      }
    });
    fd.pipe(hash);
  });
};

module.exports = { uploadFile };
