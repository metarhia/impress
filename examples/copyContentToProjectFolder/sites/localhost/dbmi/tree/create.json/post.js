module.exports = function(req, res, callback) {

	res.context.data = { status: 0 };

	console.dir({post:req.post});

/*
	req.post.operation:create_node
	req.post.id:/objects
	req.post.position:0
	req.post.title:Level 1 раздел
	req.post.type:default
*/

	var items = [],
		path = req.post.id.substring(1).split('/'),
		dbName = path[0],
		database = impress.config.databases[dbName],
		schema = database.url.substr(0, database.url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 1) {
		if (schema == 'mysql') {
			driver.query('CREATE DATABASE ??', [req.post.title], function(err, result) {
				console.dir({err:err});
				if (!err) res.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+req.post.title;
			client.connect(url, function(err, connection) {
				res.context.data = { status: 1 };
				console.dir({err:err});
				callback();
				//connection.dropDatabase(function(err, result) {
				//	if (!err) res.context.data = { status: 1 };
				//	callback();
				//});
			});
		} else callback();
	} else if (path.length == 2) {
		if (schema == 'mysql') {
			driver.query('CREATE TABLE ??', [path[1]+'.'+req.post.title], function(err, result) {
				console.dir({err:err});
				if (!err) res.context.data = { status: 1 };
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			client.connect(url, function(err, connection) {
				connection.createCollection(req.post.title, function(err, result) {
					console.dir({err:err});
					if (!err) res.context.data = { status: 1 };
					callback();
				});
			});
		} else callback();
	}

}