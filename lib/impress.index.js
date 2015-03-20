var Client = impress.Client;

// Directory index
//
Client.prototype.index = function(indexPath) {
  var client = this,
      application = client.application;

  client.execPath = client.realPath;
  client.execPathDir = client.realPathDir;
  client.fileHandler('access', false, function() {
    if (application.config.files.index) {
      if (!client.res.headersSent) client.res.setHeader('Content-Type', impress.MIME_TYPES['html']);
      var files = [], dirs = [], dirPath = '';
      client.url.split('/').forEach(function(dir) {
        if (dir !== '') {
          dirPath = dirPath + '/' + dir;
          dirs.push({ name: dir, path: dirPath + '/' });
        }
      });
      api.fs.readdir(indexPath, function(err, flist) {
        if (err) application.log.error(impress.CANT_READ_DIR + indexPath);
        else {
          files.push({ name: '/..', path: '..', size: 'up', mtime: ' ' });
          api.async.each(flist, function(fileName, cb) {
            var filePath = api.impress.addTrailingSlash(indexPath) + fileName,
                relPath = api.impress.addTrailingSlash(client.realPath) + fileName;
            api.fs.stat(filePath, function(err, stats) {
              if (!err) {
                var mtime = api.impress.nowDateTime(stats.mtime);
                if (stats.isDirectory()) files.push({ name: '/' + fileName, path: relPath + '/', size: 'dir', mtime: mtime });
                else files.push({ name: fileName, path: relPath, size: api.impress.bytesToSize(stats.size), mtime: mtime });
              }
              cb();
            });
          }, function() {
            files.sort(api.impress.sortCompareDirectories);
            client.include(
              { title: 'Directory index', path: client.url, files: files, dirs: dirs },
              application.systemTemplates['index'], '',
              function(tpl) { client.end(tpl); }
            );
          });
        }
      });
    } else client.error(403);
  });
};

// API Introspection
//
Client.prototype.introspect = function() {
  var client = this,
      application = client.application;

  if (client.req.url.slice(-1) !== '/') {
    client.redirect(client.path);
    client.end();
    return;
  }
  api.fs.stat(client.pathDir, function(err, stats) {
    if (err) client.error(404);
    else {
      if (stats.isDirectory()) {
        var files = [], dirs = [], dirPath = '';
        client.url.split('/').forEach(function(dir) {
          if (dir !== '') {
            dirPath = dirPath + '/' + dir;
            dirs.push({ name: dir, path: dirPath + '/' });
          }
        });
        application.preloadDirectory(client.path, 2, function(err, flist) {
          if (err) application.log.error(impress.CANT_READ_DIR + client.pathDir);
          else {
            files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
            api.async.each(flist, function(fileName, cb) {
              var filePath = client.pathDir + fileName;
              api.fs.stat(filePath, function(err, stats) {
                if (!err) {
                  var mtime = api.impress.nowDateTime(stats.mtime),
                      ext = api.impress.fileExt(fileName),
                      method = impress.HANDLER_TYPES[ext]; // 'unknown'
                  if (ext === 'json') { // Read metadata
                    var exports, parameter;
                    impress.HTTP_VEBS.forEach(function(verb) {
                      exports = application.cache.scripts[application.relative(filePath) + '/' + verb + '.js'];
                      if (exports && exports.meta) {
                        method += verb.toUpperCase() + ' ' + fileName + ' ' + exports.meta.description + '<ul>';
                        for (var parName in exports.meta.parameters) {
                          parameter = exports.meta.parameters[parName];
                          method += '<li>' + parName + ' - ' + parameter + '</li>';
                        }
                        method += '<li>Result: ' + exports.meta.result + '</li></ul>';
                      }
                      if (method === '') method = 'JSON Handler (no metadata)';
                    });
                  }
                  files.push({ name: '/' + fileName, path: fileName + '/', method: method, mtime: mtime });
                }
                cb();
              });
            }, function() {
              files.sort(api.impress.sortCompareByName);
              client.include(
                { title: 'API Introspection index', path: client.url, files: files, dirs: dirs },
                application.systemTemplates['introspection'], '',
                function(tpl) { client.end(tpl); }
              );
            });
          }
        });
      } else client.error(403);
    }
  });
};
