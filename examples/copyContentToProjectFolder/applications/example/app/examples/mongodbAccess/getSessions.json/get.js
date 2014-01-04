module.exports = function(req, res, callback) {
	res.context.data = [];
	db.impress.sessions.find({}).toArray(function(err, nodes) {
		res.context.data = nodes;
		callback();
	});
}