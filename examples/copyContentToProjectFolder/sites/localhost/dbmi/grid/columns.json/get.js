module.exports = function(req, res, callback) {

	res.context.data = [];

	var path = req.query.source.substring(1).split('/'),
		dbName = path[0],
		url = impress.config.databases[dbName].url,
		schema = url.substr(0, url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 3) {
		if (schema == 'mysql') {
			var tableName = path[1]+'.'+path[2];
			driver.fields(tableName, function(err, fields) {
				for (var fieldName in fields) {
					var field = fields[fieldName],
						width = field['Type'].match(/\d+/);
					if (width) width = parseInt(width[0])*8+10;
					else width = 80;
					res.context.data.push({id: field['Field'], name: field['Field'], field: field['Field'], width: Math.min(width,400), sortable: (!!fields['Key']), resizable: true });
				}
				callback();
			});
		} else if (schema == 'mongodb') {
			var client = db.drivers.mongodb.MongoClient,
				url = 'mongodb://localhost:27017/'+path[1];
			client.connect(url, function(err, connection) {
				connection.createCollection(path[2], function(err, collection) {
					collection.find({}).toArray(function(err, nodes) {
						var fields = [],
							fieldName = '_id';
						res.context.data.push({ id: fieldName, name: fieldName, field: fieldName, width: 220, sortable: true, resizable: true });
						for (var i=0; i<nodes.length; ++i) {
							var node = nodes[i],
								keys = Object.keys(node);
							for (var j=0; j<keys.length; ++j) {
								var fieldName = keys[j];
								if (fields.indexOf(fieldName) == -1 && fieldName != '_id') {
									res.context.data.push({ id: fieldName, name: fieldName, field: fieldName, width: 180, sortable: true, resizable: true });
									fields.push(fieldName);
								}
							}
						}
						callback();
					});
				});
			});
		} else callback();
	} else callback();

}