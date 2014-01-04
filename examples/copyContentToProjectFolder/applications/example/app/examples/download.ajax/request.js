module.exports = function(client, callback) {

	var fileName = 'example.png';

    client.res.setHeader('Content-Description', 'File Transfer');
	client.res.setHeader('Content-Type', 'application/x-download');
	client.res.setHeader('Content-Disposition', 'attachment; filename="'+fileName+'"');
	client.res.setHeader('Content-Transfer-Encoding', 'binary');
	client.res.setHeader('Expires', 0);
	client.res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
	client.res.setHeader('Pragma', 'no-cache');

	var filePath = client.hostDir+client.path+'/'+fileName;

	fs.stat(filePath, function(err, stats) {
		if (err) client.error(404);
		else {
			client.res.setHeader('Content-Length', stats.size);
			fs.readFile(filePath, function(error, data) {
				if (error) client.error(404);
				else client.end(data);
				callback();
			});
		}
	});

}