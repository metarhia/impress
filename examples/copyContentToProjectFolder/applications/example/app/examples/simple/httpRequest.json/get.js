module.exports = function(client, callback) {

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
				client.context.data = data;
				callback();
			});
		}
	);
	req.on('error', function(e) {
		client.context.data = "Can't get page";
		callback();
	});
	req.end();

}