module.exports = function(client, callback) {

	dbAlias.query('select * from City', function(err, rows, fields) {
		client.context.data = { rows:rows, fields:fields };
		callback();
	});

}