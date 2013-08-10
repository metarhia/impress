module.exports = function(req, res, callback) {

	res.context.data = [];

	var path = req.query.source.substring(1).split('/'),
		dbName = path[0],
		url = impress.config.databases[dbName].url,
		schema = url.substr(0, url.indexOf(':')),
		driver = db[dbName];
	if (path.length == 3) {
		if (schema == 'mysql') {
			driver.fields(path[1]+'.'+path[2], function(err, fields) {
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
			res.context.data.push({id: 'id', name: 'id', field: 'id', width: 250, sortable: true, resizable: true });
			res.context.data.push({id: 'Object', name: 'Object', field: 'Object', width: 600, sortable: false, resizable: true });
			callback();
		} else callback();
	} else callback();

}