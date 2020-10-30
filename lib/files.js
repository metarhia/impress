'use strict';

const { node, npm } = require('./dependencies.js');
const { fs, path, crypto, zlib, zipStream } = node;
const { common } = npm;
const application = require('./application.js');

const UPLOAD_SIZE_ZIP = 1048576;

const COMPRESSED_EXT = [
  'gif', 'jpg', 'jpe', 'jpeg', 'png', 'svgz',
  'docx', 'xlsx', 'pptx', 'dotx', 'odm', 'odt', 'ott', 'odp', 'otp',
  'djvu', 'djv',
  'zip', 'rar', 'z7', 'gz', 'jar', 'arj',
  'iso', 'nrg', 'img', 'apk',
  'mp2', 'mp3', 'mp4', 'avi', 'flv', 'fla', 'swf', '3gp',
  'mkv', 'mpeg', 'mpg', 'mpe', 'mov', 'asf', 'wmv', 'vob', 'ogg',
];

const NOT_COMPRESSED_EXT = [
  'txt', 'pdf', 'doc', 'dot', 'xls', 'ppt', 'rtf',
  'eml', 'uu', 'uue',
  'css', 'htm', 'html', 'xhtml', 'tpl', 'vsd', 'ps',
  'bmp', 'ico', 'eps', 'svg', 'psd', 'ai', 'tif', 'tiff',
  'wmf', 'emf', 'ani', 'cur', 'wav', 'wave', 'mid',
  'bak', 'sql', 'csv', 'xml', 'url', 'torrent',
  'js', 'php', 'pl', 'pm', 'py', 'c', 'cpp', 'cs',
  'd', 'e', 'h', 'inc', 'java', 'm', 'asm',
  'res', 'bat', 'cmd', 'exe', 'dll', 'obj', 'sys', 'msi',
];

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
  fs.unlink(data.storagePath, () => {
    fs.rename(data.storagePath + '.tmp', data.storagePath, () => {
      fs.stat(data.storagePath, (err, stats) => {
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
const uploadFile = (file, callback) => {
  const folder1 = common.generateKey(2, common.DIGIT);
  const folder2 = common.generateKey(2, common.DIGIT);
  const code = common.generateKey(8, common.ALPHA_DIGIT);
  const targetDir = path.join(application.path, 'files', folder1, folder2);
  const data = {
    compressionFlag: 'N',
    originalName: file.originalFilename,
    storageName: folder1 + folder2 + code,
    storagePath: path.join(targetDir, code),
    originalHash: '',
    originalSize: file.size,
    storageSize: file.size,
  };
  const tempFile = file.path;
  const fileExt = common.fileExt(data.originalName);
  const isComp = COMPRESSED_EXT.includes(fileExt);
  const isNotComp = NOT_COMPRESSED_EXT.includes(fileExt);
  if (!isComp && !isNotComp) {
    const msg = 'Invalid file type: ' + file.originalFilename;
    application.logger.warn(msg);
    callback(new Error(msg));
    return;
  }
  if (isNotComp) {
    // ZIP : GZIP
    data.compressionFlag = data.originalSize >= UPLOAD_SIZE_ZIP ? 'Z' : 'G';
  }
  common.mkdirp(targetDir, () => {
    const ws = fs.createWriteStream(data.storagePath);
    const rs = fs.createReadStream(tempFile);
    rs.pipe(ws);
    const fd = fs.createReadStream(tempFile);
    const hash = crypto.createHash('md5');
    hash.setEncoding('hex');
    fd.on('end', () => {
      let arc, inp, out;
      hash.end();
      data.originalHash = hash.read();
      if (data.compressionFlag === 'Z') {
        arc = new zipStream(); // eslint-disable-line new-cap
        out = fs.createWriteStream(data.storagePath + '.tmp');
        arc.pipe(out);
        arc.on('end', () => {
          saveUploadedFile(data, callback);
        });
        arc.entry(
          fs.createReadStream(data.storagePath),
          { name: data.originalName },
          (err /*entry*/) => {
            if (err) throw err;
            arc.finalize();
          }
        );
      } else if (data.compressionFlag === 'G') {
        arc = zlib.createGzip();
        inp = fs.createReadStream(data.storagePath);
        out = fs.createWriteStream(data.storagePath + '.tmp');
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

module.exports = Object.freeze({ uploadFile });
