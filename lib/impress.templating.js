'use strict';

var Client = impress.Client;

// Render template from file or cache
//   data - object or hash with data to be rendered using given template
//   file - file name to read template in native Impress format
//   cursor - dot-separated path in data object/hash
//   callback(string) - callback with one parameter containing rendered string
//
Client.prototype.template = function(data, file, cursor, callback) {
  var client = this,
      application = client.application;

  var fileName, filePath, fileCache, relPath,
      files = [];
  if (file.indexOf('.') > -1) {
    filePath = api.path.normalize(client.execPathDir + file).replace(/\\/g, '/');
    relPath = application.relative(filePath);
    return client.include(data, filePath, cursor, callback);
  }
  if (client.logged) {
    if (client.user && client.user.group) files.push(file + '.' + client.user.group);
    files.push(file + '.everyone');
  }
  files.push(file);
  // Detect cache or file exists
  api.async.detectSeries(files, function(item, cb) {
    fileName = item + '.template';
    filePath = client.execPathDir + fileName;
    relPath = application.relative(filePath);
    fileCache = application.cache.files[relPath];
    if (fileCache === impress.FILE_EXISTS) cb(true);
    else api.fs.exists(filePath, cb);
  }, function(result) {
    if (fileCache) {
      if (fileCache === impress.FILE_EXISTS) client.include(data, filePath, cursor, callback);
      else callback(impress.TPL_NOT_FOUND + relPath);
    } else if (result) {
      client.include(data, filePath, cursor, callback);
      application.cache.files[relPath] = impress.FILE_EXISTS;
      application.watchCache(api.path.dirname(relPath));
    } else {
      // Try to find template in parent directory
      if (client.execPath !== '/' && client.execPath !== '/server' && client.execPath !== '.') {
        client.execPath = api.impress.dirname(client.execPath);
        client.execPathDir = application.dir + '/server' + client.execPath;
        client.template(data, file, cursor, callback);
        application.watchCache('/server' + api.impress.stripTrailingSlash(client.execPath));
      } else {
        // Lose hope to find template and save cache
        application.cache.files[relPath] = impress.FILE_NOT_FOUND;
        application.watchCache(relPath);
        callback(impress.TPL_NOT_FOUND + relPath);
      }
    }
  });
};

// Include template
//   data - object or hash with data to be rendered using given template
//   filePath - file path relative to application directory to read template in native Impress format
//   cursor - dot-separated path in data object/hash
//   callback(string) - callback with one parameter containing rendered string
//
Client.prototype.include = function(data, filePath, cursor, callback) {
  var client = this,
      application = client.application;

  var relPath = application.relative(filePath),
      cache = application ? application.cache.templates[relPath] : null;
  if (cache) {
    if (cache === impress.FILE_IS_EMPTY) callback('');
    else client.render(data, cache, cursor, callback);
  } else {
    api.fs.readFile(filePath, 'utf8', function(err, tpl) {
      if (err) callback(impress.TPL_NOT_FOUND + filePath);
      else {
        if (!tpl) tpl = impress.FILE_IS_EMPTY;
        else {
          tpl = api.impress.removeBOM(tpl);
          if (!tpl) tpl = impress.FILE_IS_EMPTY;
        }
        if (application) application.cache.templates[relPath] = tpl;
        client.render(data, tpl, cursor, callback);
      }
    });
    filePath = application.relative(api.path.dirname(filePath));
    application.watchCache(filePath);
  }
};

// Parse template into structures
//   data - object or hash with data to be rendered using given template
//   tpl - template in native Impress format
//   cursor - dot-separated path in data object/hash
//   result - array of structure { type: string, name: string, tpl: string }
//
Client.prototype.parseTemplate = function(data, tpl, cursor) {
  var structure = [],
      pos, tplInclude, dataInclude, tplBody, arrayIndex, dataItem;

  function push(type, name, tpl) {
    structure.push({ type: type, name: name, tpl: tpl });
  }

  while (tpl.length > 0) {
    // get tpl before includes
    pos = tpl.indexOf('@[');
    if (pos >= 0) {
      push('plain', null, tpl.substr(0, pos));
      tpl = tpl.substring(pos + 2);
      // get include name
      pos = tpl.indexOf(']@');
      tplInclude = tpl.substr(0, pos);
      tpl = tpl.substring(pos + 2);
      dataInclude = api.impress.getByPath(data, (cursor ? cursor + '.' : '') + tplInclude);
      // find inline templates
      pos = tpl.indexOf('@[/' + tplInclude + ']@');
      arrayIndex = 0;
      if (pos >= 0) {
        tplBody = tpl.substr(0, pos);
        if (Array.isArray(dataInclude)) {
          for (dataItem in dataInclude) push('inline', tplInclude + '.' + arrayIndex++, tplBody);
        } else push('inline', tplInclude, tplBody );
        tpl = tpl.substring(pos + 5 + tplInclude.length);
      } else {
        // handle included templates
        if (Array.isArray(dataInclude)) {
          for (dataItem in dataInclude) push('include', tplInclude + '.' + arrayIndex++, null);
        } else push('include', tplInclude, null);
      }
    } else {
      push('plain', null, tpl);
      tpl = '';
    }
  }
  return structure;
};

// Render template from variable
//   data - object or hash with data to be rendered using given template
//   tpl - template in native Impress format
//   cursor - dot-separated path in data object/hash
//   callback(string) - callback with one parameter containing rendered string
//
Client.prototype.render = function(data, tpl, cursor, callback) {
  var client = this;

  // parse template into structure
  if (tpl !== impress.FILE_IS_EMPTY) {
    var structure = client.parseTemplate(data, tpl, cursor),
        result = '';
    api.async.eachSeries(structure, function(item, cb) {
      var cursorNew;
      if (item.type === 'plain') {
        result += api.impress.subst(item.tpl, data, cursor);
        cb();
      } else if (item.type === 'inline') {
        cursorNew = (cursor === '') ? item.name : cursor + '.' + item.name;
        client.render(data, item.tpl, cursorNew, function(tpl) {
          result += tpl;
          cb();
        });
      } else if (item.type === 'include') {
        cursorNew = (cursor === '') ? item.name : cursor + '.' + item.name;
        client.execPath = client.realPath;
        client.execPathDir = client.realPathDir;
        client.template(data, item.name, cursorNew, function(tpl) {
          if (tpl !== impress.FILE_IS_EMPTY) result += tpl || impress.TPL_NOT_FOUND + item.name;
          cb();
        });
      }
    }, function() {
      callback(result);
    });
  } else callback('');
};
