module.exports = function(req, res, callback) {
	db.polltool.query('select * from City', function(err, rows, fields) {
		if (err) throw err;
		res.context.data = { rows:rows, fields:fields };
		callback();
	});
}