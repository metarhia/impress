(client, callback) => {
  const req = api.http.request(
    {
      hostname: 'ietf.org',
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
        callback(null, buf);
      });
    }
  );

  req.on('error', err => {
    callback(err, 'Can`t get page');
  });
  req.end();
}
