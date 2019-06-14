(client, callback) => {
  api.metasync.parallel([
    callback => {
      const filePath = api.path.join(
        application.dir, 'www', client.path, 'test.txt'
      );
      api.fs.readFile(filePath, 'utf8', (error, data) => {
        callback(null, data);
      });
    },
    callback => {
      const req = api.http.request(
        {
          hostname: 'google.com',
          port: 80,
          path: '/',
          method: 'get'
        },
        response => {
          const data = [];
          response.on('data', chunk => {
            data.push(chunk);
          });
          response.on('end', () => {
            const buf = data.join('');
            callback(null, data);
          });
        }
      );
      req.on('error', err => {
        callback(err, 'Can\'t get page');
      });
      req.end();
    },
    callback => {
      dbAlias.testCollection.find({}).toArray((err, nodes) => {
        callback(null, nodes);
      });
    }
  ], (err, results) => {
    callback(null, results);
  });
};
