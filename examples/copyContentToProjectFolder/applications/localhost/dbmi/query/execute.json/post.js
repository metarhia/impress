module.exports = function(req, res, callback) {

	res.context.data = { status:0 };

	if (req.post.source) {
		var path = req.post.source.substring(1).split('/'),
			dbName = path[0],
			url = impress.config.databases[dbName].url,
			schema = url.substr(0, url.indexOf(':')),
			driver = db[dbName];
		if (path.length >= 2) {
			if (schema == 'mysql') {
				var query = driver.query(req.post.sql, [], function(err, result) {
					var msg = '';
					if (result && result.message) msg = result.message.replace('(', '');
					else if (result && Array.isArray(result)) msg = result.length+' row(s)';
					else if (err && err.code) msg = 'Error ['+err.errno+']: '+err.code;
					res.context.data = { status:1, msg:msg };
					callback();
				});
			} else callback();
		} else callback();
	} else callback();

}