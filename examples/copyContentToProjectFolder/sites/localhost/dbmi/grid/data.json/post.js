module.exports = function(req, res, callback) {

	res.context.data = {};

	var path = req.post.source.substring(1).split('/'),
		dbName = path[0],
		url = impress.config.databases[dbName].url,
		schema = url.substr(0, url.indexOf(':')),
		driver = db[dbName],
		filter = (req.post.filter) ? JSON.parse(req.post.filter) : {};
	/*
		source: dataSource,
		filter: filter,
		start: (fromPage * PAGESIZE),
		limit: (((toPage - fromPage) * PAGESIZE) + PAGESIZE),
		sortby: (sortcol) ? sortcol : '*',
		order: (sortdir > 0) ? "+asc" : "+desc")
	*/
	if (path.length == 3) {
		if (schema == 'mysql') {
			driver.select(path[1]+'.'+path[2], '*', filter, function(err, data, query) {
				if (!data) data = [];
				res.context.data = {
					start: 0,
					count: data.length,
					data: data,
					sql: query.sql
				};
				callback();
			});
		} else if (schema == 'mongodb') {
			driver.createCollection(path[2], function(err, collection) {
				collection.find({}).toArray(function(err, nodes) {
					var data = [];
					for (var i=0; i<nodes.length; ++i) {
						var node = nodes[i];
						var nodeId = node._id;
						delete node['_id'];
						data.push({id:nodeId,Object:JSON.stringify(node)});
					}
					res.context.data = {
						start: 0,
						count: data.length,
						data: data
					};
					callback();
				});
			});
		} else callback();

	} else callback();

}