module.exports = function(client, callback) {
	db.polltool.query('select * from City', function(err, rows, fields) {
		if (err) throw err;
		client.context.data = { rows:rows, fields:fields };
		callback();
	});
}