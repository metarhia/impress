module.exports = function(req, res, callback) {
	res.context.data = [];
	db.impress.users.find({}).toArray(function(err, nodes) {
		res.context.data = nodes;
		callback();
	});
}