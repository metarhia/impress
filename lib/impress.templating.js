'use strict';

// Simple templating for Impress Application Server

const Client = impress.Client;

Client.prototype.template = function(
  // Render template from file or cache
  data, // object or hash with data to be rendered using given template
  file, // file name to read template in Impress format
  cursor, // dot-separated path in data object/hash
  callback // function(s), s is rendered string
) {
  const client = this;
  const application = client.application;

  let fileName, filePath, fileCache, relPath;
  const files = [];
  if (file.includes('.')) {
    filePath = api.path.normalize(client.execPathDir + file);
    filePath = filePath.replace(impress.BACKSLASH_REGEXP, '/');
    relPath = application.relative(filePath);
    client.include(data, filePath, cursor, callback);
    return;
  }
  if (client.logged) {
    if (client.user && client.user.group) {
      files.push(file + '.' + client.user.group);
    }
    files.push(file + '.everyone');
  }
  files.push(file);
  // Detect cache or file exists
  api.metasync.find(files, (item, cb) => {
    fileName = item + '.template';
    filePath = client.execPathDir + fileName;
    relPath = application.relative(filePath);
    fileCache = application.cache.files.get(relPath);
    if (fileCache === impress.FILE_EXISTS) cb(null, true);
    else api.fs.access(filePath, err => cb(null, !err));
  }, (err, result) => {
    if (fileCache) {
      if (fileCache === impress.FILE_EXISTS) {
        client.include(data, filePath, cursor, callback);
      } else {
        callback(impress.TPL_NOT_FOUND + relPath);
      }
    } else if (result) {
      client.include(data, filePath, cursor, callback);
      application.cache.files.set(relPath, impress.FILE_EXISTS);
      application.cache.watch(api.path.dirname(relPath));
    } else if (!['/', '/www', '.'].includes(client.execPath)) {
      // Try to find template in parent directory
      client.execPath = api.common.dirname(client.execPath);
      client.execPathDir = application.dir + '/www' + client.execPath;
      client.template(data, file, cursor, callback);
      application.cache.watch(
        '/www' + api.common.stripTrailingSlash(client.execPath)
      );
    } else {
      // Lose hope to find template and save cache
      application.cache.files.set(relPath, impress.FILE_NOT_FOUND);
      application.cache.watch(relPath);
      callback(impress.TPL_NOT_FOUND + relPath);
    }
  });
};

Client.prototype.include = function(
  // Include template
  data, // object or hash with data to be rendered using given template
  filePath, // file path relative to application directory to read template
  cursor, // dot-separated path in data object/hash
  callback // function(s), s is rendered string
) {
  const client = this;
  const application = client.application;

  const relPath = application.relative(filePath);
  const cache = application ? application.cache.templates.get(relPath) : null;
  if (cache) {
    if (cache === impress.FILE_IS_EMPTY) callback('');
    else client.render(data, cache, cursor, callback);
    return;
  }
  api.fs.readFile(filePath, 'utf8', (err, tpl) => {
    if (err) {
      callback(impress.TPL_NOT_FOUND + filePath);
      return;
    }
    if (!tpl) {
      tpl = impress.FILE_IS_EMPTY;
    } else {
      tpl = api.common.removeBOM(tpl);
      if (!tpl) tpl = impress.FILE_IS_EMPTY;
    }
    if (application) application.cache.templates.set(relPath, tpl);
    client.render(data, tpl, cursor, callback);
  });
  filePath = application.relative(api.path.dirname(filePath));
  application.cache.watch(filePath);
};

Client.prototype.parseTemplate = function(
  // Parse template into structures
  data, // object or hash with data to be rendered using given template
  tpl, // template string in Impress format
  cursor // dot-separated path in data object/hash
  // Return: array of { type: string, name: string, tpl: string }
) {
  const doc = [];
  let i, len, pos, tplInclude, dataInclude, tplBody, arrayIndex, name;
  while (tpl.length > 0) {
    // get tpl before includes
    pos = tpl.indexOf('@[');
    if (pos === -1) {
      doc.push({ type: 'plain', name: null, tpl });
      tpl = '';
      continue;
    }
    doc.push({ type: 'plain', name: null, tpl: tpl.substr(0, pos) });
    tpl = tpl.substring(pos + 2);
    // get include name
    pos = tpl.indexOf(']@');
    tplInclude = tpl.substr(0, pos);
    tpl = tpl.substring(pos + 2);
    dataInclude = api.common.getByPath(
      data, (cursor ? cursor + '.' : '') + tplInclude
    );
    // find inline templates
    pos = tpl.indexOf('@[/' + tplInclude + ']@');
    arrayIndex = 0;
    if (pos > -1) {
      tplBody = tpl.substr(0, pos);
      if (Array.isArray(dataInclude)) {
        for (i = 0, len = dataInclude.length; i < len; i++) {
          name = tplInclude + '.' + arrayIndex++;
          doc.push({ type: 'inline', name, tpl: tplBody });
        }
      } else {
        doc.push({ type: 'inline', name: tplInclude, tpl: tplBody });
      }
      tpl = tpl.substring(pos + 5 + tplInclude.length);
    } else if (Array.isArray(dataInclude)) {
      // handle included templates
      for (i = 0, len = dataInclude.length; i < len; i++) {
        name = tplInclude + '.' + arrayIndex++;
        doc.push({ type: 'include', name, tpl: null });
      }
    } else {
      doc.push({ type: 'include', name: tplInclude, tpl: null });
    }
  }
  return doc;
};

Client.prototype.render = function(
  // Render template from variable
  data, // object or hash with data to be rendered using given template
  tpl, // template in Impress format
  cursor, // dot-separated path in data object/hash
  callback // function(s), s is rendered string
) {
  const client = this;

  if (tpl === impress.FILE_IS_EMPTY) {
    callback('');
    return;
  }
  const doc = client.parseTemplate(data, tpl, cursor);
  let result = '';
  api.metasync.series(
    doc,
    (item, cb) => {
      let cursorNew;
      if (item.type === 'plain') {
        result += api.common.subst(item.tpl, data, cursor);
        cb();
      } else if (item.type === 'inline') {
        cursorNew = (cursor === '') ? item.name : cursor + '.' + item.name;
        client.render(data, item.tpl, cursorNew, (tpl) => {
          result += tpl;
          cb();
        });
      } else if (item.type === 'include') {
        cursorNew = (cursor === '') ? item.name : cursor + '.' + item.name;
        client.execPath = client.realPath;
        client.execPathDir = client.realPathDir;
        client.template(data, item.name, cursorNew, (tpl) => {
          if (tpl !== impress.FILE_IS_EMPTY) {
            result += tpl || impress.TPL_NOT_FOUND + item.name;
          }
          cb();
        });
      }
    },
    () => callback(result)
  );
};
