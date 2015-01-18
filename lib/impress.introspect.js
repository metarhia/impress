// API Introspection
//
impress.Client.prototype.introspect = function() {
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
        application.preloadDirectory(client.path, 2, function() {
          api.fs.readdir(client.pathDir, function(err, flist) {
            if (err) application.log.error(impress.CANT_READ_DIR + client.pathDir);
            else {
              files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
              api.async.each(flist, function(fileName, cb) {
                var filePath = client.pathDir + fileName;
                api.async.parallel({
                  stats: function(callback) {
                    api.fs.stat(filePath, function(err, stats) {
                      callback(null, stats);
                    });
                  },
                  get: function(callback) {
                    api.fs.exists(filePath + '/get.js', function(err, exists) {
                      callback(null, exists);
                    });
                  },
                  post: function(callback) {
                    api.fs.exists(filePath + '/post.js', function(err, exists) {
                      callback(null, exists);
                    });
                  }
                }, function(err, results) {
                  if (results.stats) {
                    var mtime = api.impress.nowDateTime(results.stats.mtime);
                    if (results.stats.isDirectory()) {
                      var ext = api.impress.fileExt(fileName),
                          method = 'unknown';
                      if (ext === 'json') method = '';
                      else if (ext === 'jsonp') method = 'JSONP Handler';
                      else if (ext === 'csv') method = 'CSV';
                      else if (ext === 'ajax') method = 'AJAX Handler';
                      else if (ext === 'sse') method = 'Server-Sent Events';
                      else if (ext === 'ws') method = 'WebSocket';
                      else if (ext === '') method = 'dir';
                      // Read metadata
                      if (ext === 'json') {
                        var exports, parameter;
                        impress.HTTP_VEBS.forEach(function(verb) {
                          if (results[verb]) {
                            exports = application.cache.scripts[filePath + '/' + verb + '.js'];
                            if (exports && exports.meta) {
                              method += verb.toUpperCase() + ' ' + fileName + ' ' + exports.meta.description + '<ul>';
                              for (var parName in exports.meta.parameters) {
                                parameter = exports.meta.parameters[parName];
                                method += '<li>' + parName + ' - ' + parameter + '</li>';
                              }
                              method += '<li>Result: ' + exports.meta.result + '</li></ul>';
                            }
                          }
                          if (method === '') method = 'JSON Handler (no metadata)';
                        });
                      }
                      files.push({ name: '/' + fileName, path: fileName + '/', method: method, mtime: mtime });
                    }
                  }
                  cb();
                });
              }, function() {
                files.sort(api.impress.sortCompareByName);
                client.include(
                  { title: 'API Introspection index', path: client.url, files: files, dirs: dirs },
                    impress.templatesDir + 'introspection.template', '',
                  function(tpl) {
                    client.end(tpl);
                  }
                );
              });
            }
          });
        });
      } else client.error(403);
    }
  });
};
