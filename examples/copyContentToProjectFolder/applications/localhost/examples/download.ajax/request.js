module.exports = function(req, res, callback) {

	var fileName = 'example.png';

    res.setHeader('Content-Description', 'File Transfer');
	res.setHeader('Content-Type', 'application/x-download');
	res.setHeader('Content-Disposition', 'attachment; filename="'+fileName+'"');
	res.setHeader('Content-Transfer-Encoding', 'binary');
	res.setHeader('Expires', 0);
	res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
	res.setHeader('Pragma', 'no-cache');

	var filePath = req.impress.hostDir+req.impress.path+'/'+fileName;

	impress.fs.stat(filePath, function(err, stats) {
		if (err) impress.error(req, res, 404);
		else {
			res.setHeader('Content-Length', stats.size);
			impress.fs.readFile(filePath, function(error, data) {
				if (error) impress.error(req, res, 404);
				else res.end(data);
				callback();
			});
		}
	});

}