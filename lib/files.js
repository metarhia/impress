'use strict';

const UPLOAD_SIZE_ZIP = 1048576;

const HANDLER_TYPES = {
  '': 'dir',
  json: 'JSON Handler',
  csv: 'CSV Data',
  ajax: 'AJAX Template',
  ws: 'WebSocket',
  rpc: 'Impress RPC',
};

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
impress.uploadFile = (application, file, callback) => {
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
  const config = application.config.sections.filestorage;
  const { extCompressed, extNotCompressed } = config;
  const isComp = extCompressed.includes(fileExt);
  const isNotComp = extNotCompressed.includes(fileExt);
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

// Directory index
//   indexPath <string> path to directory
impress.dirIndex = (application, indexPath, relativePath, callback) => {
  const files = [];
  const dirs = [];
  let dirPath = '';
  const steps = relativePath.split('/');
  for (const dir of steps) {
    if (dir !== '') {
      dirPath = api.path.join(dirPath, dir);
      dirs.push({ name: dir, path: dirPath + '/' });
    }
  }
  api.fs.readdir(indexPath, (err, flist) => {
    if (err) {
      application.log.error(impress.CANT_READ_DIR + indexPath);
      return;
    }
    files.push({ name: '/..', path: '..', size: 'up', mtime: ' ' });
    api.metasync.each(flist, (name, next) => {
      let filePath = api.common.addTrailingSlash(indexPath);
      let relPath = api.common.addTrailingSlash(relativePath);
      filePath += name;
      relPath += name;
      api.fs.stat(filePath, (err, stats) => {
        if (err) {
          next();
          return;
        }
        const mtime = api.common.nowDateTime(stats.mtime);
        let size;
        if (stats.isDirectory()) {
          name = '/' + name;
          relPath += '/';
          size = 'dir';
        } else {
          size = api.common.bytesToSize(stats.size);
        }
        files.push({ name, path: relPath, size, mtime });
        next();
      });
    }, () => {
      files.sort(api.common.sortCompareDirectories);
      callback(null, files, dirs);
    });
  });
};

impress.dirIntrospect = (application, relPath, callback) => {
  const path = api.path.join(application.dir, 'www', relPath);
  api.fs.stat(path, (err, stats) => {
    if (err) {
      callback(err);
      return;
    }
    if (!stats.isDirectory()) {
      callback(new Error(impress.CANT_READ_DIR + path));
      return;
    }
    const files = [];
    const dirs = [];
    let dirPath = '';
    const steps = relPath.split('/');
    for (const dir of steps) {
      if (dir !== '') {
        dirPath = api.path.join(dirPath, dir);
        dirs.push({ name: dir, path: dirPath + '/' });
      }
    }
    application.preloadDirectory(relPath, 2, (err, flist) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + path);
        return;
      }
      files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
      api.metasync.each(flist, (name, next) => {
        const filePath = path + name;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            next();
            return;
          }
          const mtime = api.common.nowDateTime(stats.mtime);
          const ext = api.common.fileExt(name);
          const method = HANDLER_TYPES[ext]; // 'unknown'
          const path = name + '/';
          files.push({ name: '/' + name, path, method, mtime });
          next();
        });
      }, () => {
        files.sort(api.common.sortCompareByName);
        callback(null, files, dirs);
      });
    });
  });
};
