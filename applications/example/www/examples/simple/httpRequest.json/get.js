(client, callback) => {
  const req = api.http.request(
    {
      hostname: 'ietf.org',
      port: 80,
      path: '/',
      method: 'get'
    },
    (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        callback(null, data);
      });
    }
  );

  req.on('error', (err) => {
    callback(err, 'Can`t get page');
  });
  req.end();
}
