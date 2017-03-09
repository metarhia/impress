(client, callback) => {
  api.metasync.parallel[
    (callback) => {
      const filePath = application.dir + '/www' + client.path + '/test.txt';
      api.fs.readFile(filePath, 'utf8', (error, data) => {
        callback(null, data);
      });
    },
    (callback) => {
      const req = api.http.request(
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
    (callback) => {
      dbAlias.testCollection.find({}).toArray((err, nodes) => {
        callback(null, nodes);
      });
    }
  ], (err, results) => {
    callback(results);
  });
}
