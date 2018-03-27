'use strict';

// Directory and API index for Impress Application Server

const HANDLER_TYPES = {
  '': 'dir',
  json: 'JSON Handler',
  jsonp: 'JSONP Handler',
  csv: 'CSV Data',
  ajax: 'AJAX Template',
  sse: 'Server-Sent Events',
  ws: 'WebSocket',
  rpc: 'Impress RPC'
};

const Client = impress.Client;

Client.prototype.index = function(
  // Directory index (genetrate HTML page based on /templates/index.template)
  indexPath // path to directory
) {
  const application = this.application;

  if (!this.url.endsWith('/')) {
    this.redirect(this.path);
    this.end();
    return;
  }

  this.execPath = this.realPath;
  this.execPathDir = this.realPathDir;
  this.fileHandler('access', false, () => {
    if (!application.config.files.index) {
      this.error(403);
      return;
    }
    if (!this.res.headersSent) {
      this.res.setHeader('Content-Type', impress.MIME_TYPES.html);
    }
    const files = [];
    const dirs = [];
    let dirPath = '';
    this.url.split('/').forEach((dir) => {
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
        let relPath = api.common.addTrailingSlash(this.realPath);
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
          title: 'Directory index', path: this.url, files, dirs
        };
        const template = application.systemTemplates.index;
        this.include(data, template, '', tpl => this.end(tpl));
      });
    });
  });
};

Client.prototype.introspect = function(
  // API Introspection
) {
  const application = this.application;

  if (!this.req.url.endsWith('/')) {
    this.redirect(this.path);
    this.end();
    return;
  }

  api.fs.stat(this.pathDir, (err, stats) => {
    if (err) {
      this.error(404);
      return;
    }
    if (!stats.isDirectory()) {
      this.error(403);
      return;
    }
    const files = [];
    const dirs = [];
    let dirPath = '';
    this.url.split('/').forEach((dir) => {
      if (dir !== '') {
        dirPath = dirPath + '/' + dir;
        dirs.push({ name: dir, path: dirPath + '/' });
      }
    });
    application.preloadDirectory(this.path, 2, (err, flist) => {
      if (err) {
        application.log.error(impress.CANT_READ_DIR + this.pathDir);
        return;
      }
      files.push({ name: '/..', path: '..', method: 'up', mtime: ' ' });
      api.metasync.each(flist, (name, cb) => {
        const filePath = this.pathDir + name;
        api.fs.stat(filePath, (err, stats) => {
          if (err) {
            cb();
            return;
          }
          const mtime = api.common.nowDateTime(stats.mtime);
          const ext = api.common.fileExt(name);
          let method = HANDLER_TYPES[ext]; // 'unknown'
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
          title: 'API Introspection index', path: this.url, files, dirs
        };
        const template = application.systemTemplates.introspection;
        this.include(data, template, '', tpl => {
          this.end(tpl);
        });
      });
    });
  });
};
