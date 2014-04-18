module.exports = function(client, callback) {
	dbAliad.query('select * from City', function(err, rows, fields) {
		client.context.data = { rows:rows, fields:fields };
		callback();
	});
}