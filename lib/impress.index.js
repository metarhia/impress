'use strict';

// Directory and API index for Impress Application Server
//
var Client = impress.Client;

// Directory index (genetrate HTML page based on /templates/index.template)
//   indexPath - path to directory
//
Client.prototype.index = function(indexPath) {
  var client = this,
      application = client.application;

  if (!api.common.endsWith(client.url, '/')) {
    client.redirect(client.path);
    return client.end();
  }

  client.execPath = client.realPath;
  client.execPathDir = client.realPathDir;
  client.fileHandler('access', false, function() {
    if (application.config.files.index) {
      if (!client.res.headersSent) {
        client.res.setHeader('Content-Type', impress.MIME_TYPES.html);
      }
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
          api.common.each(flist, function(fileName, cb) {
            var filePath = api.common.addTrailingSlash(indexPath) + fileName,
                relPath = api.common.addTrailingSlash(client.realPath) + fileName;
            api.fs.stat(filePath, function(err, stats) {
              if (!err) {
                var mtime = api.common.nowDateTime(stats.mtime);
                if (stats.isDirectory()) {
                  files.push({
                    name: '/' + fileName,
                    path: relPath + '/',
                    size: 'dir',
                    mtime: mtime
                  });
                } else {
                  files.push({
                    name: fileName,
                    path: relPath,
                    size: api.common.bytesToSize(stats.size),
                    mtime: mtime
                  });
                }
              }
              cb();
            });
          }, function() {
            files.sort(api.impress.sortCompareDirectories);
            client.include(
              {
                title: 'Directory index',
                path: client.url,
                files: files, dirs: dirs
              },
              application.systemTemplates.index, '',
              function(tpl) {
                client.end(tpl);
              }
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

  if (!api.common.endsWith(client.req.url, '/')) {
    client.redirect(client.path);
    return client.end();
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
            api.common.each(flist, function(fileName, cb) {
              var filePath = client.pathDir + fileName;
              api.fs.stat(filePath, function(err, stats) {
                if (!err) {
                  var mtime = api.common.nowDateTime(stats.mtime),
                      ext = api.common.fileExt(fileName),
                      method = impress.HANDLER_TYPES[ext]; // 'unknown'
                  if (ext === 'json') { // Read metadata
                    var exports, parameter, scriptName;
                    impress.HTTP_VEBS.forEach(function(verb) {
                      scriptName = application.relative(filePath) + '/' + verb + '.js';
                      exports = application.cache.scripts[scriptName];
                      if (exports && exports.meta) {
                        method += (
                          verb.toUpperCase() + ' ' +
                          fileName + ' ' +
                          exports.meta.description + '<ul>'
                        );
                        for (var parName in exports.meta.parameters) {
                          parameter = exports.meta.parameters[parName];
                          method += '<li>' + parName + ' - ' + parameter + '</li>';
                        }
                        method += '<li>Result: ' + exports.meta.result + '</li></ul>';
                      }
                      if (method === '') method = 'JSON Handler (no metadata)';
                    });
                  }
                  files.push({
                    name: '/' + fileName,
                    path: fileName + '/',
                    method: method,
                    mtime: mtime
                  });
                }
                cb();
              });
            }, function() {
              files.sort(api.impress.sortCompareByName);
              client.include(
                {
                  title: 'API Introspection index',
                  path: client.url,
                  files: files,
                  dirs: dirs
                },
                application.systemTemplates.introspection, '',
                function(tpl) {
                  client.end(tpl);
                }
              );
            });
          }
        });
      } else client.error(403);
    }
  });
};
