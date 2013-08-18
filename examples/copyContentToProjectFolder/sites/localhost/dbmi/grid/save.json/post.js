module.exports = function(req, res, callback) {

	res.context.data = { status:0 };

	var path = req.post.source.substring(1).split('/'),
		dbName = path[0],
		url = impress.config.databases[dbName].url,
		schema = url.substr(0, url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 3) {
		if (schema == 'mysql') {
			delete req.post.source;
			driver.update(path[1]+'.'+path[2], req.post, function(err, affectedRows, query) {
				res.context.data = {
					status: affectedRows>0 ? 1 : 0,
					sql: query.sql
				};
				callback();
			});
		} else if (schema == 'mongodb') {
			callback();
		} else callback();
	} else callback();


}