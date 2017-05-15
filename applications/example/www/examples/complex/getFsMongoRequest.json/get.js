(client, callback) => {
  api.metasync.parallel([
    (data, callback) => {
      const filePath = application.dir + '/www' + client.path + '/test.txt';
      api.fs.readFile(filePath, 'utf8', (error, file) => {
        data.readFile = 'File size: ' + file.length;
        callback();
      });
    },
    (data, callback) => {
      const req = api.http.request(
        {
          hostname: 'google.com',
          port: 80,
          path: '/',
          method: 'get'
        },
        (response) => {
          let buffer = '';
          response.on('data', chunk => buffer += chunk);
          response.on('end', () => {
            data.page = 'Page size: ' + buffer.length;
            callback();
          });
        }
      );
      req.on('error', (err) => {
        data.getError = err.toString();
        callback();
      });
      req.end();
    },
    (data, callback) => {
      if (application.databases.dbAlias) {
        dbAlias.testCollection.find({}).toArray((err, nodes) => {
          data.nodes = nodes;
          callback();
        });
      } else {
        data.db = 'No database';
        callback();
      }
    }
  ], (err, results) => {
    callback({ results });
  });
}
