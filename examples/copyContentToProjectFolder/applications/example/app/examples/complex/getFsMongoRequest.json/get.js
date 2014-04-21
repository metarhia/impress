module.exports = function(client, callback) {

	impress.async.parallel({
		file: function(callback) {
			var filePath = client.hostDir+client.path+'/test.txt';
			fs.readFile(filePath, 'utf8', function(error, data) {
				callback(null, data);
			});
		},
		request: function(callback) {
			var req = impress.http.request(
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
						callback(null, data);
					});
				}
			);
			req.on('error', function(e) {
				callback(null, "Can't get page");
			});
			req.end();
		},
		mongo: function(callback) {
			dbAlias.testCollection.find({}).toArray(function(err, nodes) {
				callback(null, nodes);
			});
		}
	}, function(err, results) {
		client.context.data = results;
		callback();
	});

}