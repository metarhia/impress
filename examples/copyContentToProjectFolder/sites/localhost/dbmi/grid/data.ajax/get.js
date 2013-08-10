module.exports = function(req, res, callback) {

	res.context.data = {};

	var path = req.query.id.substring(1).split('/'),
		dbName = path[0];
		url = impress.config.databases[dbName].url,
		schema = url.substr(0, url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 3) {
		if (schema == 'mysql') {
			driver.select(path[2], '*', {}, function(err, data) {
				res.context.data.query = JSON.stringify(data);
				callback();
				return;
			});
		} else if (schema == 'mongodb') {

		}
	} else callback();

}