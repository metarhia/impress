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
    return client.include(data, filePath, cursor, callback);
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
    if (fileCache === impress.FILE_EXISTS) cb(true);
    else api.fs.exists(filePath, cb);
  }, (result) => {
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
    } else if (
      // Try to find template in parent directory
      client.execPath !== '/' &&
      client.execPath !== '/www' &&
      client.execPath !== '.'
    ) {
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
    if (cache === impress.FILE_IS_EMPTY) {
      callback('');
    } else {
      client.render(data, cache, cursor, callback);
    }
  } else {
    api.fs.readFile(filePath, 'utf8', (err, tpl) => {
      if (err) {
        callback(impress.TPL_NOT_FOUND + filePath);
      } else {
        if (!tpl) {
          tpl = impress.FILE_IS_EMPTY;
        } else {
          tpl = api.common.removeBOM(tpl);
          if (!tpl) tpl = impress.FILE_IS_EMPTY;
        }
        if (application) application.cache.templates.set(relPath, tpl);
        client.render(data, tpl, cursor, callback);
      }
    });
    filePath = application.relative(api.path.dirname(filePath));
    application.cache.watch(filePath);
  }
};

Client.prototype.parseTemplate = function(
  // Parse template into structures
  data, // object or hash with data to be rendered using given template
  tpl, // template string in Impress format
  cursor // dot-separated path in data object/hash
  // Return: array of structure { type: string, name: string, tpl: string }
) {
  const structure = [];
  let pos, tplInclude, dataInclude, tplBody, arrayIndex;

  function push(type, name, tpl) {
    structure.push({ type, name, tpl });
  }

  while (tpl.length > 0) {
    // get tpl before includes
    pos = tpl.indexOf('@[');
    if (pos > -1) {
      push('plain', null, tpl.substr(0, pos));
      tpl = tpl.substring(pos + 2);
      // get include name
      pos = tpl.indexOf(']@');
      tplInclude = tpl.substr(0, pos);
      tpl = tpl.substring(pos + 2);
      dataInclude = api.common.getByPath(
        data,
        (cursor ? cursor + '.' : '') + tplInclude
      );
      // find inline templates
      pos = tpl.indexOf('@[/' + tplInclude + ']@');
      let i, len;
      arrayIndex = 0;
      if (pos > -1) {
        tplBody = tpl.substr(0, pos);
        if (Array.isArray(dataInclude)) {
          for (i = 0, len = dataInclude.length; i < len; i++) {
            push('inline', tplInclude + '.' + arrayIndex++, tplBody);
          }
        } else {
          push('inline', tplInclude, tplBody);
        }
        tpl = tpl.substring(pos + 5 + tplInclude.length);
      } else if (Array.isArray(dataInclude)) {
        // handle included templates
        for (i = 0, len = dataInclude.length; i < len; i++) {
          push('include', tplInclude + '.' + arrayIndex++, null);
        }
      } else {
        push('include', tplInclude, null);
      }
    } else {
      push('plain', null, tpl);
      tpl = '';
    }
  }
  return structure;
};

Client.prototype.render = function(
  // Render template from variable
  data, // object or hash with data to be rendered using given template
  tpl, // template in Impress format
  cursor, // dot-separated path in data object/hash
  callback // function(s), s is rendered string
) {
  const client = this;

  // parse template into structure
  if (tpl !== impress.FILE_IS_EMPTY) {
    const structure = client.parseTemplate(data, tpl, cursor);
    let result = '';
    api.metasync.series(structure, (item, cb) => {
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
    }, () => callback(result));
  } else callback('');
};
