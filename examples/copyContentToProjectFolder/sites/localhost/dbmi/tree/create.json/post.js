module.exports = function(req, res, callback) {

	res.context.data = { status: 0 };

	var items = [],
		path = req.post.id.substring(1).split('/'),
		dbName = path[0],
		database = impress.config.databases[dbName],
		schema = database.url.substr(0, database.url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 1) {
		if (schema == 'mysql') {
			driver.query('CREATE DATABASE '+db.escape(req.post.title), [], function(err, result) {
				if (!err) res.context.data = { status: 1, id: req.post.id+'/'+req.post.title };
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+req.post.title;
			client.connect(url, function(err, connection) {
				res.context.data = { status: 1, id: req.post.id+'/'+req.post.title };
				callback();
				//connection.dropDatabase(function(err, result) {
				//	if (!err) res.context.data = { status: 1 };
				//	callback();
				//});
			});
		} else callback();
	} else if (path.length == 2) {
		if (schema == 'mysql') {
			driver.query('CREATE TABLE '+db.escape(path[1]+'.'+req.post.title), [], function(err, result) {
				if (!err) res.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			client.connect(url, function(err, connection) {
				connection.createCollection(req.post.title, function(err, result) {
					if (!err) res.context.data = { status: 1 };
					callback();
				});
			});
		} else callback();
	}

}