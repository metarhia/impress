module.exports = function(client, callback) {
  var req = api.http.request(
    {
      hostname: 'ietf.org',
      port: 80,
      path: '/',
      method: 'get'
    },
    function(response) {
      var data = '';
      response.on('data', function(chunk) {
        data += chunk;
      });
      response.on('end', function() {
        callback(data);
      });
    }
  );

  req.on('error', function(e) {
    callback('Can`t get page');
  });
  req.end();
};
