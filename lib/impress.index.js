'use strict';

// Directory and API index for Impress Application Server
//
const Client = impress.Client;

// Directory index (genetrate HTML page based on /templates/index.template)
//   indexPath - path to directory
//
Client.prototype.index = function(indexPath) {
  let client = this,
      application = client.application;

  if (!client.url.endsWith('/')) {
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
      let files = [], dirs = [], dirPath = '';
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
          api.metasync.each(flist, function(fileName, cb) {
            let filePath = api.common.addTrailingSlash(indexPath);
            let relPath = api.common.addTrailingSlash(client.realPath);
            filePath += fileName;
            relPath += fileName;
            api.fs.stat(filePath, function(err, stats) {
              if (!err) {
                let mtime = api.common.nowDateTime(stats.mtime);
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
            files.sort(api.common.sortCompareDirectories);
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
  let client = this,
      application = client.application;

  if (!client.req.url.endsWith('/')) {
    client.redirect(client.path);
    return client.end();
  }

  api.fs.stat(client.pathDir, function(err, stats) {
    if (err) client.error(404);
    else if (stats.isDirectory()) {
      let files = [], dirs = [], dirPath = '';
      client.url.split('/').forEach(function(dir) {
        if (dir !== '') {
          dirPath = dirPath + '/' + dir;
          dirs.push({ name: dir, path: dirPath + '/' });
        }
      });
      application.preloadDirectory(client.path, 2, function(err, flist) {
        if (err) {
          application.log.error(impress.CANT_READ_DIR + client.pathDir);
        } else {
          files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
          api.metasync.each(flist, function(fileName, cb) {
            let filePath = client.pathDir + fileName;
            api.fs.stat(filePath, function(err, stats) {
              if (!err) {
                let mtime = api.common.nowDateTime(stats.mtime),
                    ext = api.common.fileExt(fileName),
                    method = impress.HANDLER_TYPES[ext]; // 'unknown'
                if (ext === 'json') { // Read metadata
                  let exports, parameter, scriptName;
                  impress.HTTP_VEBS.forEach(function(verb) {
                    scriptName = (
                      application.relative(filePath) + '/' + verb + '.js'
                    );
                    exports = application.cache.scripts[scriptName];
                    if (exports && exports.meta) {
                      method += (
                        verb.toUpperCase() + ' ' +
                        fileName + ' ' +
                        exports.meta.description + '<ul>'
                      );
                      for (let parName in exports.meta.parameters) {
                        parameter = exports.meta.parameters[parName];
                        method += (
                          '<li>' + parName + ' - ' + parameter + '</li>'
                        );
                      }
                      method += (
                        '<li>Result: ' + exports.meta.result + '</li></ul>'
                      );
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
            files.sort(api.common.sortCompareByName);
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
  });
};
