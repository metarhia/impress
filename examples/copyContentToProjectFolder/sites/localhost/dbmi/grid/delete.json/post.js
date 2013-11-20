module.exports = function(req, res, callback) {

	res.context.data = { status: 0 };

	var items = [],
		path = req.post.source.substring(1).split('/'),
		dbName = path[0],
		database = impress.config.databases[dbName],
		schema = database.url.substr(0, database.url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 3) {
		if (schema == 'mysql') {
			var tableName = path[1]+'.'+path[2];
			var query = driver.query('DELETE FROM '+db.escape(tableName)+' WHERE '+req.post.pkName+'=?', [req.post.pkValue], function(err, result) {
				if (!err) {
					var sql = query.sql.replace(path[1]+'.', ''); // replace(/`/g, '').
					res.context.data = { status: 1, sql: sql };
				}
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			client.connect(url, function(err, connection) {
				connection.createCollection(path[2], function(err, collection) {
					collection.remove({ _id: db.mongodb.oid(req.post.pkValue) }, function(err, collection) {
						if (!err) res.context.data = { status: 1 };
						callback();
					});
				});
			});
		} else callback();
	} else callback();

}