module.exports = function(req, res, callback) {

	var serializeData = function(err, nodes) {
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var item = {
				attr: {
					id: node.id,
					rel: node.type ? node.type : "root"
				},
				data: node.name,
				state: "closed"
			};
			if (node.type == 'table' || node.type == 'view' || node.type == 'collection') {
				item.state = "open";
				item.attr.class = "jstree-leaf";
			}
			res.context.data.push(item);
		}
	}

	res.context.data = [];

	if (req.query.id == 1) {
		var providers = [],
			databases = impress.config.databases;
		for (var databaseName in databases) {
			var database = databases[databaseName];
			providers.push({ id:"/"+databaseName, name:databaseName+' ('+database.url+')', type:"provider" });
		}
		serializeData(null, providers);
		callback();
	} else {
		var items = [],
			path = req.query.id.substring(1).split('/'),
			dbName = path[0],
			database = impress.config.databases[dbName],
			schema = database.url.substr(0, database.url.indexOf(':')),
			driver = db[dbName];
		if (path.length == 1) {
			if (schema == 'mysql') {
				driver.databases(function(err, databases) {
					for (var i = 0; i < databases.length; i++) {
						items.push({ id:"/"+dbName+"/"+databases[i], name:databases[i], type:"database" });
					}
					serializeData(null, items);
					callback();
				});
			} else if (schema == 'mongodb') {
				driver.admin().listDatabases(function(err, databases) {
					databases = databases.databases;
					for (var i = 0; i < databases.length; i++) {
						items.push({ id:"/"+dbName+"/"+databases[i].name, name:databases[i].name, type:"database" });
					}
					serializeData(null, items);
					callback();
				});
			}
		} else if (path.length == 2) {
			if (schema == 'mysql') {
				driver.databaseTables(path[1], function(err, tables) {
					for (var tableName in tables) {
						var table = tables[tableName];
						items.push({ id:"/"+path[0]+"/"+path[1]+"/"+table['TABLE_NAME'], name:table['TABLE_NAME'], type:"table" });
					}
					serializeData(null, items);
					callback();
				});
			} else if (schema == 'mongodb') {
				var client = db.drivers.mongodb.MongoClient,
					url = 'mongodb://localhost:27017/'+path[1];
				client.connect(url, function(err, connection) {
					connection.collections(function(err, collections) {
						for (var i = 0; i < collections.length; i++) {
							if (collections[i].db.databaseName == path[1]) {
								items.push({ id:"/"+path[0]+"/"+path[1]+"/"+collections[i].collectionName, name:collections[i].collectionName, type:"collection" });
							}
						}
						serializeData(null, items);
						callback();
					});
				});
			}
		}
	}

}