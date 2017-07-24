'use strict';

// Directory and API index for Impress Application Server

const Client = impress.Client;

Client.prototype.index = function(
  // Directory index (genetrate HTML page based on /templates/index.template)
  indexPath // path to directory
) {
  const client = this;
  const application = client.application;

  if (!client.url.endsWith('/')) {
    client.redirect(client.path);
    client.end();
    return;
  }

  client.execPath = client.realPath;
  client.execPathDir = client.realPathDir;
  client.fileHandler('access', false, () => {
    if (!application.config.files.index) {
      client.error(403);
      return;
    }
    if (!client.res.headersSent) {
      client.res.setHeader('Content-Type', impress.MIME_TYPES.html);
    }
    const files = [];
    const dirs = [];
    let dirPath = '';
    client.url.split('/').forEach((dir) => {
      if (dir !== '') {
        dirPath = dirPath + '/' + dir;
        dirs.push({ name: dir, path: dirPath + '/' });
      }
    });
    api.fs.readdir(indexPath, (err, flist) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + indexPath);
        return;
      }
      files.push({ name: '/..', path: '..', size: 'up', mtime: ' ' });
      api.metasync.each(flist, (name, cb) => {
        let filePath = api.common.addTrailingSlash(indexPath);
        let relPath = api.common.addTrailingSlash(client.realPath);
        filePath += name;
        relPath += name;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            cb();
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
          cb();
        });
      }, () => {
        files.sort(api.common.sortCompareDirectories);
        const data = {
          title: 'Directory index', path: client.url, files, dirs
        };
        const template = application.systemTemplates.index;
        client.include(data, template, '', tpl => client.end(tpl));
      });
    });
  });
};

Client.prototype.introspect = function(
  // API Introspection
) {
  const client = this;
  const application = client.application;

  if (!client.req.url.endsWith('/')) {
    client.redirect(client.path);
    client.end();
    return;
  }

  api.fs.stat(client.pathDir, (err, stats) => {
    if (err) {
      client.error(404);
      return;
    }
    if (!stats.isDirectory()) {
      client.error(403);
      return;
    }
    const files = [];
    const dirs = [];
    let dirPath = '';
    client.url.split('/').forEach((dir) => {
      if (dir !== '') {
        dirPath = dirPath + '/' + dir;
        dirs.push({ name: dir, path: dirPath + '/' });
      }
    });
    application.preloadDirectory(client.path, 2, (err, flist) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + client.pathDir);
        return;
      }
      files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
      api.metasync.each(flist, (name, cb) => {
        const filePath = client.pathDir + name;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            cb();
            return;
          }
          const mtime = api.common.nowDateTime(stats.mtime);
          const ext = api.common.fileExt(name);
          let method = impress.HANDLER_TYPES[ext]; // 'unknown'
          if (ext === 'json') {
            let exports, parameter, scriptName;
            impress.HTTP_VERBS.forEach((verb) => {
              scriptName = application.relative(filePath) + '/' + verb + '.js';
              exports = application.cache.scripts.get(scriptName);
              if (exports && exports.meta) {
                verb = verb.toUpperCase();
                method += `${verb} ${name} ${exports.meta.description}<ul>`;
                let parName;
                for (parName in exports.meta.parameters) {
                  parameter = exports.meta.parameters[parName];
                  method += `<li>${parName} - ${parameter}</li>`;
                }
                method += `<li>Result: ${exports.meta.result}</li></ul>`;
              }
              if (method === '') method = 'JSON Handler (no metadata)';
            });
          }
          const path = name + '/';
          name = '/' + name;
          files.push({ name, path, method, mtime });
          cb();
        });
      }, () => {
        files.sort(api.common.sortCompareByName);
        const data = {
          title: 'API Introspection index', path: client.url, files, dirs
        };
        const template = application.systemTemplates.introspection;
        client.include(data, template, '', tpl => client.end(tpl));
      });
    });
  });
};
