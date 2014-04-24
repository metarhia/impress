module.exports = function(client, callback) {

	dbAlias.query('select * from City', function(err, rows, fields) {
		callback({ rows:rows, fields:fields });
	});

}