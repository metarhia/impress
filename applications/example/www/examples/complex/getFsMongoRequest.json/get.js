(client, callback) => {
  api.async.parallel({
    file: (callback) => {
      let filePath = application.dir + '/www' + client.path + '/test.txt';
      api.fs.readFile(filePath, 'utf8', (error, data) => {
        callback(null, data);
      });
    },
    request: (callback) => {
      let req = api.http.request(
        {
          hostname: 'google.com',
          port: 80,
          path: '/',
          method: 'get'
        },
        (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => callback(null, data));
        }
      );
      req.on('error', (/*err*/) => {
        callback(null, 'Can\'t get page');
      });
      req.end();
    },
    mongo: (callback) => {
      dbAlias.testCollection.find({}).toArray((err, nodes) => {
        callback(null, nodes);
      });
    }
  }, (err, results) => {
    callback(results);
  });
}
