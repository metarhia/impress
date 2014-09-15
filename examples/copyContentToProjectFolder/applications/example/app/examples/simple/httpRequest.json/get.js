module.exports = function(client, callback) {

  var req = api.http.request(
    {
      hostname: 'google.com',
      port: 80,
      path: '/',
      method: 'get'
    },
    function(response) {
      var data = '';
      response.on('data', function(chunk) {
        data = data+chunk;
      });
      response.on('end', function() {
        callback(data);
      });
    }
  );
  req.on('error', function(e) {
    callback("Can't get page");
  });
  req.end();

}